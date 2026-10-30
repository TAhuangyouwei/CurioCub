"""Decode every vocabulary recording and check new-clip provenance and legacy hashes."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import av
from check_hanzi_audio_assets import measure

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'scripts/english-audio'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', action='store_true')
    args = parser.parse_args()
    words = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify(require('./data/english-vocabulary').words))"], cwd=ROOT).decode('utf-8'))
    legacy = json.loads((STAGE / 'legacy-hashes.json').read_text(encoding='utf-8'))
    rows = []
    for word in words:
        key = word['id']
        file = ROOT / word['audioFile'].lstrip('/')
        if args.stage and not word['legacyId']:
            file = STAGE / 'clips' / f'{key}.mp3'
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        duration, audible = measure(file)
        assert .25 <= duration <= 3 and audible >= .08, f'Silent or invalid recording: {key}'
        with av.open(str(file)) as media:
            stream = media.streams.audio[0]
            assert stream.rate == 24000 and stream.layout.name == 'mono', key
            assert 'mp3' in stream.codec_context.name, key
        if word['legacyId']:
            assert digest == legacy[file.name], f'Original recording changed: {key}'
            row = dict(id=key, target=word['audioFile'], retained=True, sha256=digest)
        else:
            row = json.loads((STAGE / 'clips' / f'{key}.json').read_text(encoding='utf-8'))
            assert row['id'] == key and row['voice'] == 'zh-CN-XiaoxiaoNeural' and row['rate'] == '+0%'
            assert row['bitrate'] == '24k' and row['sha256'] == digest, key
            assert row['endMargin'] + row['tailPadding'] >= .12, key
            source = ROOT / row['source']
            assert hashlib.sha256(source.read_bytes()).hexdigest() == row['sourceSha256'], key
            if key == 'read':
                assert row['text'] == 'reed', '读使用现在时的长元音 /ri:d/'
        rows.append({**row, 'duration': round(duration, 4), 'audible': round(float(audible), 4)})
    assert len(rows) == 150 and sum(bool(word['legacyId']) for word in words) == 12
    name = 'checked-stage.json' if args.stage else 'manifest.json'
    (STAGE / name).write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Passed: 150 decodable, audible vocabulary recordings; 138 Xiaoxiao clips with full provenance; 12 original hashes unchanged.')


if __name__ == '__main__':
    main()
