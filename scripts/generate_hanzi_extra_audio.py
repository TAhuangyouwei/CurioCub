"""Build October's offline audio without changing existing learning recordings."""

import argparse
import asyncio
import json
import subprocess
import tempfile
from pathlib import Path

from import_public_pinyin_audio import convert
from generate_hanzi_voice import generate_clip


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'packages' / 'hanzi-extra' / 'audio'


def read_units():
    script = """
    const { getModule } = require('./data/learning')
    process.stdout.write(JSON.stringify(getModule('hanzi').items.filter(unit => unit.packageName === 'hanzi-extra')))
    """
    result = subprocess.run(['node', '-e', script], cwd=ROOT, check=True, capture_output=True)
    return json.loads(result.stdout.decode('utf-8'))


async def build_phrase(unit, ffmpeg, force=False):
    import edge_tts

    target = OUTPUT / f"{unit['id']}-phrase.mp3"
    if not force and target.exists() and target.stat().st_size > 0:
        return
    for attempt in range(3):
        try:
            with tempfile.TemporaryDirectory(prefix='curiocub-phrase-') as directory:
                source = Path(directory) / 'source.mp3'
                encoded = Path(directory) / 'encoded.mp3'
                await edge_tts.Communicate(
                    text=unit['phrase'], voice='zh-CN-XiaoxiaoNeural', rate='-5%'
                ).save(str(source))
                convert(ffmpeg, source, encoded)
                target.write_bytes(encoded.read_bytes())
            print(f"Ready {target.name}", flush=True)
            return
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', type=Path, required=True)
    parser.add_argument('--force', action='store_true', help='Regenerate existing phrase clips')
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    units = read_units()
    semaphore = asyncio.Semaphore(3)

    async def limited(unit):
        async with semaphore:
            await generate_clip(unit, 'characterAudioFile', ROOT, args.ffmpeg)
            await build_phrase(unit, args.ffmpeg, args.force)

    await asyncio.gather(*(limited(unit) for unit in units))
    print(f"Complete: {len(units)} character clips + {len(units)} phrase clips", flush=True)


if __name__ == '__main__':
    asyncio.run(main())
