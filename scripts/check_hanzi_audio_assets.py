"""Decode every lesson and practice recording, with provenance for repaired syllables."""
import json
from pathlib import Path
import subprocess
import av
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def measure(file):
    chunks = []
    resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
    with av.open(str(file)) as media:
        for frame in media.decode(audio=0):
            chunks.extend(output.to_ndarray().reshape(-1) for output in resampler.resample(frame))
        chunks.extend(output.to_ndarray().reshape(-1) for output in resampler.resample(None))
    samples = np.concatenate(chunks)
    return len(samples) / 16000, np.count_nonzero(np.abs(samples) > 0.01) / 16000


def main():
    units = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"], cwd=ROOT).decode('utf-8'))
    rows = []
    for unit in units:
        row = {key: unit[key] for key in ['id', 'title', 'pinyin', 'phrase']}
        clips = []
        for field in ['characterAudioFile', 'phraseAudioFile']:
            filename = unit[field]
            clips.append((field, ROOT / (filename.lstrip('/') if filename.startswith('/') else 'assets/audio/' + filename)))
        clips.append(('practiceAudioFile', ROOT / 'packages/hanzi-practice/audio' / (unit['id'] + '.mp3')))
        for field, file in clips:
            duration, audible = measure(file)
            assert duration >= 0.18 and audible >= 0.06, f'{unit["title"]} {field}: silent or truncated'
            row[field] = {'path': file.relative_to(ROOT).as_posix(), 'duration': round(duration, 3), 'audible': round(audible, 3)}
        rows.append(row)
    target = ROOT / 'scripts/audio-audit/checked-assets.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Passed: {len(rows)} characters, {len(rows) * 3} decodable and audible lesson/phrase/practice recordings.')


if __name__ == '__main__':
    main()
