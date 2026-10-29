"""Build the selected local pinyin voice pack for CurioCub.

The resulting MP3 files are staged by mini-program subpackage for review.
This script never writes unreviewed recordings into product packages.
"""

import asyncio
import json
import shutil
from pathlib import Path

import edge_tts
from xiaoxiao_pinyin import VOICE, RATE, PITCH, APPROVED_SOURCES, spoken_pinyin


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'pinyin-syllables.js'
PACKAGES = ROOT / 'scripts/audio-audit/pinyin-generation-stage/packages'

PACKAGE_BY_INITIAL = {
    'a': 'pinyin-01', 'b': 'pinyin-01', 'c': 'pinyin-02',
    'd': 'pinyin-03', 'e': 'pinyin-03', 'f': 'pinyin-03',
    'g': 'pinyin-04', 'h': 'pinyin-04', 'j': 'pinyin-05', 'k': 'pinyin-05',
    'l': 'pinyin-06', 'm': 'pinyin-07', 'n': 'pinyin-07', 'o': 'pinyin-07',
    'p': 'pinyin-08', 'q': 'pinyin-08', 'r': 'pinyin-09', 's': 'pinyin-09',
    't': 'pinyin-10', 'w': 'pinyin-10', 'x': 'pinyin-11', 'y': 'pinyin-11',
    'z': 'pinyin-12'
}


def read_examples():
    source = SOURCE.read_text(encoding='utf-8')
    json_text = source.split('=', 1)[1].split('\n\nmodule.exports', 1)[0].strip()
    return json.loads(json_text)


def ensure_loader(package_name):
    loader = PACKAGES / package_name / 'pages' / 'loader'
    loader.mkdir(parents=True, exist_ok=True)
    files = {
        'index.js': 'Page({})\n',
        'index.json': '{"navigationBarTitleText":"拼读声音"}\n',
        'index.wxml': '<view></view>\n',
        'index.wxss': ''
    }
    for filename, content in files.items():
        target = loader / filename
        if not target.exists():
            target.write_text(content, encoding='utf-8')


async def create_clip(key, semaphore):
    package_name = PACKAGE_BY_INITIAL[key[0]]
    ensure_loader(package_name)
    target = PACKAGES / package_name / 'audio' / f'{key}.mp3'
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 1000:
        return 'skipped', key

    async with semaphore:
        for attempt in range(3):
            try:
                source = APPROVED_SOURCES.get(key)
                if source:
                    shutil.copyfile(source, target)
                else:
                    communicate = edge_tts.Communicate(spoken_pinyin(key), voice=VOICE, rate=RATE, pitch=PITCH)
                    await communicate.save(str(target))
                if target.stat().st_size <= 1000:
                    raise RuntimeError('generated file is unexpectedly small')
                return 'created', key
            except Exception:
                if target.exists():
                    target.unlink()
                if attempt == 2:
                    return 'failed', key
                await asyncio.sleep(attempt + 1)


async def main():
    examples = read_examples()
    semaphore = asyncio.Semaphore(4)
    tasks = [create_clip(key, semaphore) for key in sorted(examples)]
    created = skipped = 0
    failures = []
    for number, task in enumerate(asyncio.as_completed(tasks), start=1):
        status, key = await task
        if status == 'created':
            created += 1
        elif status == 'skipped':
            skipped += 1
        else:
            failures.append(key)
        if number % 50 == 0 or number == len(tasks):
            print(f'Progress {number}/{len(tasks)}; created={created}; skipped={skipped}; failed={len(failures)}')

    if failures:
        raise SystemExit(f'Failed to generate: {", ".join(failures)}')
    print(f'Completed {len(tasks)} clips; created={created}; skipped={skipped}')


if __name__ == '__main__':
    asyncio.run(main())
