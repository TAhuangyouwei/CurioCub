"""Check audible pinyin button clips and the previously truncated de2 syllable.

Requires PyAV and numpy. Checking file existence alone misses short, quiet MP3s.
"""
from pathlib import Path

import av
import numpy as np
from import_public_pinyin_audio import INITIAL_SOURCES

ROOT = Path(__file__).resolve().parents[1]


def measure(path):
    resampler = av.AudioResampler(format='fltp', layout='mono', rate=24000)
    chunks = []
    with av.open(str(path)) as media:
        for frame in media.decode(audio=0):
            chunks.extend(output.to_ndarray().reshape(-1) for output in resampler.resample(frame))
        chunks.extend(output.to_ndarray().reshape(-1) for output in resampler.resample(None))
    samples = np.concatenate(chunks) if chunks else np.zeros(0)
    duration = len(samples) / 24000
    audible = np.count_nonzero(np.abs(samples) > 0.01) / 24000
    return duration, audible


def main():
    assert len(INITIAL_SOURCES) == 23
    assert all(source.endswith('1') for source in INITIAL_SOURCES.values()), 'Initial teaching clips must use level-tone sources'
    files = sorted((ROOT / 'assets/audio/pinyin-basic').glob('*.mp3'))
    files.append(ROOT / 'packages/pinyin-03/audio/de2.mp3')
    failures = []
    for path in files:
        duration, audible = measure(path)
        if duration < 0.18 or audible < 0.06:
            failures.append(f'{path.relative_to(ROOT)}: duration={duration:.3f}s, audible={audible:.3f}s')
        if path.name in ('initial-d.mp3', 'de2.mp3') and (duration < 1 or audible < 0.5):
            failures.append(f'{path.name}: expected the complete source recording, not its truncated onset')
    assert not failures, 'Silent or truncated pinyin recordings:\n' + '\n'.join(failures)
    print(f'Pinyin audio check passed: {len(files)} decoded clips have audible speech; d/de2 retain the full recording.')


if __name__ == '__main__':
    main()
