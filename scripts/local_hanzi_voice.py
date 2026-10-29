"""Pronunciation-controlled local probes. No app resources are overwritten.

Model: hexgrad/Kokoro-82M-v1.1-zh (Apache-2.0).
ONNX contract: thewh1teagle/kokoro-onnx; phones: hexgrad/misaki/zh_frontend.py.
"""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave

import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / 'scripts/audio-audit/local-tts'
sys.path.insert(0, str(MODEL_DIR / 'runtime'))
from pypinyin.contrib.tone_convert import to_finals, to_initials, to_tone3


def phone_map():
    # Read only the published constant; do not execute the downloaded frontend.
    tree = ast.parse((MODEL_DIR / 'zh_frontend.py').read_text(encoding='utf-8'))
    assignment = next(node for node in tree.body if isinstance(node, ast.Assign)
                      and any(isinstance(target, ast.Name) and target.id == 'ZH_MAP' for target in node.targets))
    return ast.literal_eval(assignment.value)


def phonemes(pinyin):
    """Use the card's explicit pronunciation, without guessing from its character."""
    tone = to_tone3(pinyin, neutral_tone_with_five=True)[-1]
    if tone not in '12345':
        raise ValueError(f'Missing tone: {pinyin}')
    initial = to_initials(pinyin, strict=True)
    final = to_finals(pinyin, strict=True)
    if not final:
        raise ValueError(f'Not a pinyin syllable: {pinyin}')
    if final == 'i' and initial in ['z', 'c', 's']: final = 'ii'
    elif final == 'i' and initial in ['zh', 'ch', 'sh', 'r']: final = 'iii'
    mapping = phone_map()
    return ''.join(mapping[part] for part in [initial, final] if part) + tone


def synthesize(session, voices, voice, phones):
    vocab = json.loads(session.get_modelmeta().custom_metadata_map['kokoro_config'])['vocab']
    tokens = [vocab[phone] for phone in phones]  # Reject unknown phones, never silently omit them.
    inputs = {item.name: item for item in session.get_inputs()}
    token_name = 'input_ids' if 'input_ids' in inputs else 'tokens'
    dtype = {'tensor(int64)': np.int64, 'tensor(int32)': np.int32, 'tensor(float)': np.float32}
    feed = {
        token_name: np.array([[0, *tokens, 0]], dtype=dtype[inputs[token_name].type]),
        'style': np.asarray(voices[voice][len(tokens) - 1], dtype=dtype[inputs['style'].type]),
        'speed': np.array([1.0], dtype=dtype[inputs['speed'].type]),
    }
    return np.asarray(session.run(None, feed)[0]).flatten()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--voice', default='zf_001')
    parser.add_argument('--ffmpeg', type=Path, required=True)
    args = parser.parse_args()
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(MODEL_DIR / 'kokoro-v1.1-zh.onnx'), sess_options=options,
                                  providers=['CPUExecutionProvider'])
    voices = np.load(MODEL_DIR / 'voices-v1.1-zh.bin', allow_pickle=False)
    output = ROOT / 'scripts/audio-audit/local-voice-probe' / args.voice
    output.mkdir(parents=True, exist_ok=True)
    cases = [('le', '了', 'le'), ('la', '啦', 'la'), ('chang', '长', 'cháng'), ('zhang', '掌', 'zhǎng'),
             ('dei', '得', 'děi'), ('zhe', '着', 'zhe'), ('de', '的', 'de'), ('ji', '几', 'jǐ'),
             ('shei', '谁', 'shéi'), ('zhu', '竹', 'zhú'), ('tu', '土', 'tǔ')]
    manifest = []
    for name, character, pinyin in cases:
        phones = phonemes(pinyin) + '.'
        audio = synthesize(session, voices, args.voice, phones)
        if not np.isfinite(audio).all(): raise ValueError('Non-finite audio')
        pcm = (np.clip(audio, -1, 1) * 32767).astype('<i2')
        wav = output / f'{name}.wav'
        with wave.open(str(wav), 'wb') as target:
            target.setparams((1, 2, 24000, 0, 'NONE', 'not compressed'))
            target.writeframes(pcm.tobytes())
        mp3 = wav.with_suffix('.mp3')
        subprocess.run([str(args.ffmpeg), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(wav),
                        '-b:a', '48k', str(mp3)], check=True)
        row = dict(title=character, pinyin=pinyin, phonemes=phones, voice=args.voice, speed=1.0,
                   contextExtracted=False, postProcessing=False, listeningReview='pending',
                   path=mp3.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(mp3.read_bytes()).hexdigest())
        manifest.append(row)
        print(character, pinyin, phones, round(len(audio) / 24000, 3), flush=True)
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
