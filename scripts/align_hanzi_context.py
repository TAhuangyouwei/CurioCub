"""Local acoustic alignment for short Chinese contexts (TinyAligner ONNX)."""
import json
from pathlib import Path

import av
import numpy as np
import onnxruntime as ort

MODEL_DIR = Path(__file__).parent / 'audio-audit/tiny-aligner'


def waveform(file):
    resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
    chunks = []
    with av.open(str(file)) as media:
        for frame in media.decode(audio=0):
            chunks.extend(out.to_ndarray().reshape(-1) for out in resampler.resample(frame))
        chunks.extend(out.to_ndarray().reshape(-1) for out in resampler.resample(None))
    return np.concatenate(chunks)


def features(samples):
    padded = np.pad(samples, (256, 256), mode='reflect')
    frames = np.lib.stride_tricks.sliding_window_view(padded, 512)[::160]
    windows = np.zeros(frames.shape)
    windows[:, :400] = frames[:, :400] * np.hanning(400)
    power = np.abs(np.fft.rfft(windows)) ** 2
    points = np.linspace(2595 * np.log10(1 + 80 / 700), 2595 * np.log10(1 + 7600 / 700), 42)
    bins = np.floor(513 * 700 * (10 ** (points / 2595) - 1) / 16000).astype(int)
    bank = np.zeros((40, 257))
    for index in range(40):
        left, center, right = bins[index:index + 3]
        if center > left: bank[index, left:center] = np.arange(center - left) / (center - left)
        if right > center: bank[index, center:right] = np.arange(right - center, 0, -1) / (right - center)
    mel = np.log(power @ bank.T + 1e-6)
    return ((mel - mel.mean()) / (mel.std() + 1e-5)).astype(np.float32)[None]


def align(file, text, pronunciations=None):
    data = json.loads((MODEL_DIR / 'lexicon.json').read_text(encoding='utf-8'))
    vocab = data['phone2idx']
    phone_groups = [data['lexicon'][char] for char in text]
    if pronunciations:
        for index, phones in pronunciations.items(): phone_groups[index] = phones
    phones = ['sil'] + [phone for group in phone_groups for phone in group] + ['sil']
    ids = [int(vocab[phone]) for phone in phones]
    session = ort.InferenceSession(str(MODEL_DIR / 'model.onnx'), providers=['CPUExecutionProvider'])
    emissions = session.run(None, {'mel': features(waveform(file))})[0]
    labels = np.array([0] + [value for item in ids for value in (item, 0)])
    time_steps, states = len(emissions), len(labels)
    scores = np.full(states, -1e12)
    scores[:2] = emissions[0, labels[:2]]
    back = np.zeros((time_steps, states), dtype=int)
    for time in range(1, time_steps):
        previous = scores.copy()
        for state in range(states):
            candidates = [state]
            if state: candidates.append(state - 1)
            if state > 1 and labels[state] != 0 and labels[state] != labels[state - 2]: candidates.append(state - 2)
            best = max(candidates, key=lambda item: previous[item])
            scores[state] = previous[best] + emissions[time, labels[state]]
            back[time, state] = best
    state = max((states - 2, states - 1), key=lambda item: scores[item])
    path = np.zeros(time_steps, dtype=int)
    for time in range(time_steps - 1, -1, -1):
        path[time] = state
        state = back[time, state]
    result, offset = [], 1
    for char, group in zip(text, phone_groups):
        active = np.flatnonzero((path >= offset * 2 + 1) & (path <= (offset + len(group) - 1) * 2 + 1))
        result.append({'text': char, 'start': float(active[0] * .02), 'end': float((active[-1] + 1) * .02)})
        offset += len(group)
    return result


def single_span(file, text, title):
    """Use acoustic phones, not the service's estimated word timestamps."""
    clean = ''.join(char for char in text if '\u4e00' <= char <= '\u9fff')
    if clean.count(title) != 1:
        raise ValueError('Context must contain the target exactly once')
    index = clean.index(title)
    overrides = {'得': ['d', 'ei3'], '着': ['zh', 'e5'], '啊': ['aa', 'a5'], '吧': ['b', 'a5']}
    override = {index: overrides[title]} if title in overrides else None
    words = align(file, clean, override)
    target = words[index]
    samples = waveform(file)
    if index + 1 < len(words):
        # End in the lowest-energy 10 ms frame before the next character's onset.
        left = int(target['end'] * 16000)
        right = int(words[index + 1]['start'] * 16000)
        choices = list(range(left, max(left + 1, right - 160), 80))
        end = min(choices, key=lambda pos: float(np.mean(samples[pos:pos + 160] ** 2))) / 16000
        end = max(end, target['end'])
    else:
        audible = np.flatnonzero(np.abs(samples) > 0.0003)
        end = min(len(samples) / 16000, audible[-1] / 16000 + 0.04)
    start = target['start']
    if not 0.06 <= end - start <= 0.8:
        raise ValueError(f'Invalid acoustic target window: {start}, {end}')
    return start, end - start


if __name__ == '__main__':
    import sys
    print(json.dumps(align(Path(sys.argv[1]), sys.argv[2]), ensure_ascii=False))
