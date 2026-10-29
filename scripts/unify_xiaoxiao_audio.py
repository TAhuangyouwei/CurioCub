"""Replace non-Xiaoxiao product recordings in a verified staging directory."""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

from check_hanzi_audio_assets import measure
from generate_hanzi_voice import ROOT, asset_path
from xiaoxiao_pinyin import VOICE, RATE, PITCH, APPROVED_SOURCES, LISTENING_APPROVED_KEYS, basic_key, spoken_pinyin

STAGE = ROOT / 'scripts/audio-audit/xiaoxiao-unified-stage'


def read_data():
    script = "process.stdout.write(JSON.stringify({hanzi:require('./data/learning').getModule('hanzi').items,english:require('./data/learning').getModule('english').items}))"
    return json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT).decode('utf-8'))


def plan():
    data = read_data()
    rows = []
    def add(path, category, text, key='', source=None, **extra):
        row = dict(path=str(path).replace('\\', '/'), category=category, text=text, key=key,
                   source=str(source) if source else '', voice=VOICE, rate=RATE, pitch=PITCH)
        if source and Path(source).with_suffix('.json').exists():
            metadata = json.loads(Path(source).with_suffix('.json').read_text(encoding='utf-8'))
            assert metadata.get('voice') == VOICE and metadata.get('listeningReview') != 'rejected'
            row.update(rate=metadata.get('rate', RATE), sourceText=metadata['text'],
                       vowelExtracted=metadata.get('vowelExtracted', False))
        row.update(extra)
        rows.append(row)
    for directory in sorted((ROOT / 'packages').glob('pinyin-[0-9][0-9]/audio')):
        for file in sorted(directory.glob('*.mp3')):
            key = file.stem
            add(file.relative_to(ROOT), 'pinyin-syllable', spoken_pinyin(key), key, APPROVED_SOURCES.get(key))
    for file in sorted((ROOT / 'assets/audio/pinyin-basic').glob('*.mp3')):
        parts = file.stem.split('-')
        key = basic_key(parts[0], parts[1], int(parts[2]) if len(parts) == 3 else 1)
        add(file.relative_to(ROOT), 'pinyin-basic', spoken_pinyin(key), key, APPROVED_SOURCES.get(key))
    for file in sorted((ROOT / 'packages/pinyin-basic-v2/audio').glob('*.mp3')):
        kind, value = file.stem.split('-')
        key = basic_key(kind, value)
        add(file.relative_to(ROOT), 'pinyin-basic-copy', spoken_pinyin(key), key, APPROVED_SOURCES.get(key))
    basics = [('final', value) for value in ['a', 'o', 'e', 'i', 'u', 'v']] + [('initial', value) for value in ['b', 'p', 'm', 'f', 'd', 't']]
    for index, (kind, value) in enumerate(basics, 1):
        key = basic_key(kind, value)
        add(f'assets/audio/pinyin-{index:02}.mp3', 'pinyin-card', spoken_pinyin(key), key, APPROVED_SOURCES.get(key))
    # These 41 single-character sources and the 12 English words were generated
    # directly with Xiaoxiao in this run. Keep explicit metadata, not filename guesses.
    rest = ROOT / 'scripts/audio-audit/xiaoxiao-rest-stage/manifest.json'
    if rest.exists():
        for row in json.loads(rest.read_text(encoding='utf-8')):
            source = ROOT / row['source']
            assert row['voice'] == VOICE and hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
            if row['kind'] == 'english':
                add(row['path'].lstrip('/'), 'english', row['text'], source=source, id=row['id'])
            else:
                unit = next(u for u in data['hanzi'] if u['id'] == row['id'])
                for path in [asset_path(unit, 'characterAudioFile'), f'packages/hanzi-practice/audio/{unit["id"]}.mp3']:
                    add(path, 'hanzi', row['text'], source=source, id=unit['id'], pinyin=unit['pinyin'])
    baseline = ROOT / 'scripts/audio-audit/before-xiaoxiao-unification/hanzi-sources-before.json'
    old = json.loads((baseline if baseline.exists() else ROOT / 'scripts/audio-sources/manifest.json').read_text(encoding='utf-8'))
    for item in old:
        if item.get('voice') == VOICE or item['title'] == '几': continue
        unit = next(u for u in data['hanzi'] if u['id'] == item['id'])
        # The existing Xiaoxiao stage already contains isolated readings, including
        # exact acoustic extraction for neutral syllables. Never use rejected clips.
        source = ROOT / 'scripts/audio-audit/same-voice-stage' / asset_path(unit, 'characterAudioFile')
        metadata = json.loads(source.with_suffix('.json').read_text(encoding='utf-8'))
        assert metadata['voice'] == VOICE and metadata.get('listeningReview') != 'rejected'
        if unit['title'] == '谁':
            source = ROOT / 'scripts/audio-audit/xiaoxiao-pinyin-probe/shei2.mp3'
            metadata = dict(text='shéi', voice=VOICE, rate=RATE, contextExtracted=False)
        for path in [asset_path(unit, 'characterAudioFile'), f'packages/hanzi-practice/audio/{unit["id"]}.mp3']:
            add(path, 'hanzi', metadata['text'], source=source, id=unit['id'], pinyin=unit['pinyin'],
                contextExtracted=metadata['contextExtracted'], rate=metadata['rate'])
    assert len({row['path'] for row in rows}) == len(rows)
    assert not any(row['path'] in ['assets/audio/hanzi-19-character.mp3', 'assets/audio/hanzi-24-character.mp3',
                                  'packages/hanzi-practice/audio/hanzi-19.mp3', 'packages/hanzi-practice/audio/hanzi-24.mp3'] for row in rows)
    return rows


async def stage(rows, ffmpeg):
    import edge_tts
    semaphore = asyncio.Semaphore(3)
    raw_dir = STAGE / 'sources'
    raw_dir.mkdir(parents=True, exist_ok=True)
    previous_file = STAGE / 'manifest.json'
    previous = {r['path']: r for r in json.loads(previous_file.read_text(encoding='utf-8'))} if previous_file.exists() else {}
    groups = {}
    for row in rows:
        identity = row['source'] or row['text']
        groups.setdefault(identity, []).append(row)
    done, pending = 0, []
    async def generate(identity, copies):
        nonlocal done
        row = copies[0]
        async with semaphore:
            raw = Path(row['source']) if row['source'] else raw_dir / (hashlib.sha256(identity.encode()).hexdigest()[:20] + '.mp3')
            if row['source'] and not raw.exists():
                pending.append(row['key'])
                return
            if not raw.exists():
                for attempt in range(4):
                    try:
                        await edge_tts.Communicate(row['text'], voice=VOICE, rate=RATE, pitch=PITCH, receive_timeout=30).save(str(raw))
                        break
                    except Exception:
                        if attempt == 3: raise
                        if raw.exists(): raw.unlink()
                        await asyncio.sleep(attempt + 1)
            duration, audible = measure(raw)
            assert duration >= .18 and audible >= .06, row
            source_hash = hashlib.sha256(raw.read_bytes()).hexdigest()
            for copy in copies:
                target = STAGE / copy['path']
                target.parent.mkdir(parents=True, exist_ok=True)
                old = previous.get(copy['path'], {})
                reusable = target.exists() and old.get('sourceSha256') == source_hash and old.get('sha256') == hashlib.sha256(target.read_bytes()).hexdigest()
                if not reusable:
                    bitrate = '16k' if copy['path'].startswith('packages/hanzi-practice/') else '24k'
                    subprocess.run([str(ffmpeg), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(raw),
                                    '-ar', '24000', '-ac', '1', '-b:a', bitrate, '-map_metadata', '-1', str(target)], check=True)
                copy.update(source=raw.relative_to(ROOT).as_posix(), sourceSha256=source_hash,
                            sha256=hashlib.sha256(target.read_bytes()).hexdigest(), duration=duration, audible=float(audible))
            done += 1
            if done % 50 == 0: print(f'Staged {done}/{len(groups)} source recordings', flush=True)
    await asyncio.gather(*(generate(identity, copies) for identity, copies in groups.items()))
    previous.update({row['path']: row for row in rows})
    (STAGE / 'manifest.json').write_text(json.dumps(list(previous.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Staged {done} sources, {len(rows)} product files; pending: {pending}', flush=True)
    return pending


def publish(rows):
    # No production writes until every planned file has passed.
    for row in rows:
        if row['category'].startswith('pinyin'):
            assert row['key'] in LISTENING_APPROVED_KEYS, f'拼音尚未通过试听，保留原录音：{row["key"]}'
            assert row['sourceSha256'] == hashlib.sha256(APPROVED_SOURCES[row['key']].read_bytes()).hexdigest()
        target = STAGE / row['path']
        assert row.get('sha256') and hashlib.sha256(target.read_bytes()).hexdigest() == row['sha256'], row['path']
        duration, audible = measure(target)
        assert duration >= .18 and audible >= .06
    selected = hashlib.sha256('\n'.join(sorted(row['path'] for row in rows)).encode()).hexdigest()[:12]
    preview = STAGE / 'preflight' / selected
    for row in rows:
        file = preview / row['path']
        file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(STAGE / row['path'], file)
    subprocess.run(['node', 'scripts/check_package_size.js', '--audio-stage', str(preview)], cwd=ROOT, check=True)
    backup = ROOT / 'scripts/audio-audit/before-xiaoxiao-unification'
    baseline = backup / 'hanzi-sources-before.json'
    baseline.parent.mkdir(parents=True, exist_ok=True)
    if not baseline.exists(): shutil.copyfile(ROOT / 'scripts/audio-sources/manifest.json', baseline)
    for row in rows:
        target, source = ROOT / row['path'], STAGE / row['path']
        saved = backup / row['path']
        saved.parent.mkdir(parents=True, exist_ok=True)
        if not saved.exists(): shutil.copyfile(target, saved)
        shutil.copyfile(source, target)
    ledger = ROOT / 'scripts/audio-sources/xiaoxiao-unified-manifest.json'
    published = {row['path']: row for row in json.loads(ledger.read_text(encoding='utf-8'))} if ledger.exists() else {}
    published.update({row['path']: row for row in rows})
    ledger.write_text(json.dumps(list(published.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    source_file = ROOT / 'scripts/audio-sources/manifest.json'
    old_sources = json.loads(source_file.read_text(encoding='utf-8'))
    indexed = {row['id']: row for row in old_sources}
    units = {unit['id']: unit for unit in read_data()['hanzi']}
    for identity in sorted({row['id'] for row in rows if row['category'] == 'hanzi'}):
        copies = [row for row in rows if row.get('id') == identity and row['category'] == 'hanzi']
        row, unit = copies[0], units[identity]
        info = indexed.get(identity, {})
        info.update(id=identity, title=unit['title'], pinyin=unit['pinyin'], phrase=unit['phrase'],
                    voice=VOICE, rate=row['rate'], text=row['text'], origin='Microsoft Edge TTS / Xiaoxiao',
                    source=row['source'], sourceSha256=row['sourceSha256'],
                    contextExtracted=row.get('contextExtracted', False), postProcessing=False,
                    files=[dict(path=r['path'], sha256=r['sha256']) for r in copies])
        indexed[identity] = info
    source_file.write_text(json.dumps(list(indexed.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Published {len(rows)} files, all {VOICE}', flush=True)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', type=Path, required=True)
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--only', choices=['all', 'non-pinyin', 'approved-pinyin'], default='all')
    args = parser.parse_args()
    rows = plan()
    if args.only == 'non-pinyin': rows = [row for row in rows if row['category'] in ('hanzi', 'english')]
    elif args.only == 'approved-pinyin': rows = [row for row in rows if row['category'].startswith('pinyin') and row['key'] in LISTENING_APPROVED_KEYS]
    print('Planned:', {category: sum(r['category'] == category for r in rows) for category in sorted({r['category'] for r in rows})}, flush=True)
    pending = await stage(rows, args.ffmpeg)
    if args.publish:
        assert not pending, f'待确认的音不能发布：{pending}'
        publish(rows)


if __name__ == '__main__':
    asyncio.run(main())
