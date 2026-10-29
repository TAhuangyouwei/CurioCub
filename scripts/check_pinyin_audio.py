"""Check audible pinyin button clips and the previously truncated de2 syllable.

Requires PyAV and numpy. Checking file existence alone misses short, quiet MP3s.
"""
from pathlib import Path
import json

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
    files += sorted((ROOT / 'packages').glob('pinyin-[0-9][0-9]/audio/*.mp3'))
    files += sorted((ROOT / 'packages/pinyin-basic-v2/audio').glob('*.mp3'))
    files += sorted((ROOT / 'assets/audio').glob('pinyin-[0-9][0-9].mp3'))
    failures = []
    manifest_file = ROOT / 'scripts/audio-sources/xiaoxiao-unified-manifest.json'
    provenance = {row['path']: row for row in json.loads(manifest_file.read_text(encoding='utf-8'))} if manifest_file.exists() else {}
    restored_file = ROOT / 'scripts/audio-sources/pinyin-restored-manifest.json'
    if restored_file.exists():
        provenance.update({row['path']: row for row in json.loads(restored_file.read_text(encoding='utf-8'))})
    for path in files:
        duration, audible = measure(path)
        if duration < 0.18 or audible < 0.06:
            failures.append(f'{path.relative_to(ROOT)}: duration={duration:.3f}s, audible={audible:.3f}s')
        row = provenance.get(path.relative_to(ROOT).as_posix())
        if row or path.name in ('initial-d.mp3', 'de2.mp3'):
            if row:
                source_duration, source_audible = measure(ROOT / row['source'])
                complete = duration >= source_duration - .08 and audible >= source_audible * .85
            else:
                complete = duration >= 1 and audible >= .5
            if not complete:
                failures.append(f'{path.relative_to(ROOT)}: expected the complete source recording, not its truncated onset')
    assert not failures, 'Silent or truncated pinyin recordings:\n' + '\n'.join(failures)
    print(f'Pinyin audio check passed: {len(files)} decoded clips have audible speech; d/de2 retain the full recording.')


if __name__ == '__main__':
    main()
