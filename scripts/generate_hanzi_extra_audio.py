"""Build October's offline audio without changing existing learning recordings."""

import argparse
import asyncio
import json
import shutil
import subprocess
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'packages' / 'hanzi-extra' / 'audio'
SILENCE_FILTER = (
    'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:'
    'stop_periods=1:stop_silence=0.06:stop_threshold=-45dB'
)


def read_units():
    script = """
    const rows = require('./data/hanzi-extra')
    const { getModule } = require('./data/learning')
    const { getPinyinLocalAudio } = require('./data/pinyin-local-audio')
    const units = getModule('hanzi').items.slice(-rows.length)
    process.stdout.write(JSON.stringify(rows.map((row, i) => ({
      id: units[i].id, phrase: row[1],
      characterSource: getPinyinLocalAudio(row[4]).filePath
    }))))
    """
    result = subprocess.run(['node', '-e', script], cwd=ROOT, check=True, capture_output=True)
    return json.loads(result.stdout.decode('utf-8'))


async def build_phrase(unit, ffmpeg):
    target = OUTPUT / f"{unit['id']}-phrase.mp3"
    if target.exists() and target.stat().st_size > 0:
        return
    source = OUTPUT / f"{unit['id']}-phrase-source.mp3"
    for attempt in range(3):
        try:
            await edge_tts.Communicate(
                text=unit['phrase'], voice='zh-CN-XiaoxiaoNeural', rate='-5%'
            ).save(str(source))
            subprocess.run([
                str(ffmpeg), '-y', '-hide_banner', '-loglevel', 'error',
                '-i', str(source), '-af', SILENCE_FILTER,
                '-ar', '24000', '-ac', '1', '-b:a', '32k',
                '-map_metadata', '-1', str(target),
            ], check=True)
            source.unlink()
            print(f"Ready {target.name}", flush=True)
            return
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', type=Path, required=True)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    units = read_units()
    for unit in units:
        source = ROOT / unit['characterSource'].lstrip('/')
        if not source.is_file():
            raise FileNotFoundError(f"Missing pronunciation: {source}")
        shutil.copyfile(source, OUTPUT / f"{unit['id']}-character.mp3")
    semaphore = asyncio.Semaphore(3)

    async def limited(unit):
        async with semaphore:
            await build_phrase(unit, args.ffmpeg)

    await asyncio.gather(*(limited(unit) for unit in units))
    print(f"Complete: {len(units)} character clips + {len(units)} phrase clips", flush=True)


if __name__ == '__main__':
    asyncio.run(main())
