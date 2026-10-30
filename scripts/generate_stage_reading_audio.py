"""Prepare offline stage-test speech with the existing free speech tool; no paid APIs.

Only this feature's new recordings and practice-package duplicate character clips
are encoded. Keep lesson source recordings and all other packages intact.
"""
import asyncio
import argparse
import json
import shutil
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/english-audio-runtime'))
import edge_tts
import imageio_ffmpeg

STAGE = ROOT / 'scripts/stage-reading-audio'
# The speech-retention audit flags these fricatives after MP3 re-encoding.
# Preserve the complete source, including its original sample rate and pauses.
FULL_CHARACTER_AUDIO = set('心星锁先鞋稀死岁香')


def encode(source, target, bitrate='16k'):
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-hide_banner', '-loglevel', 'error',
                    '-i', str(source), '-af', 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.14,areverse',
                    '-ar', '16000', '-ac', '1', '-b:a', bitrate, '-map_metadata', '-1', str(target)], check=True)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--compact-characters', action='store_true', help='Trim silence in practice-only duplicate character clips at 16 kbps')
    args = parser.parse_args()
    data = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify({sentences:require('./packages/hanzi-practice/data/reading').sentences.filter(x=>x.endStation),units:require('./data/learning').getModule('hanzi').items}))"], cwd=ROOT).decode('utf-8'))
    sentences = data['sentences']
    if args.compact_characters:
        before = after = 0
        for unit in data['units']:
            source = unit['characterAudioFile']
            source = ROOT / (source.lstrip('/') if source.startswith('/') else 'assets/audio/' + source)
            target = ROOT / 'packages/hanzi-practice/audio' / (unit['id'] + '.mp3')
            before += target.stat().st_size
            if unit['title'] in FULL_CHARACTER_AUDIO:
                shutil.copyfile(source, target)
            else:
                encode(source, target)
            after += target.stat().st_size
        print(f'Practice duplicate clips: {before} -> {after} bytes', flush=True)
    (STAGE / 'raw').mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(3)

    async def clip(sentence):
        target = ROOT / sentence['audio'].lstrip('/')
        if target.exists() and target.stat().st_size:
            return
        async with semaphore:
            raw = STAGE / 'raw' / (sentence['id'] + '.mp3')
            if not raw.exists() or not raw.stat().st_size:
                for attempt in range(3):
                    try:
                        await edge_tts.Communicate(sentence['text'], voice='zh-CN-XiaoxiaoNeural', rate='-12%',
                                                  connect_timeout=10, receive_timeout=30).save(str(raw))
                        break
                    except Exception:
                        if attempt == 2:
                            raise
                        await asyncio.sleep(attempt + 1)
            encode(raw, target)
            print('Ready', sentence['id'], flush=True)

    await asyncio.gather(*(clip(sentence) for sentence in sentences))


if __name__ == '__main__':
    asyncio.run(main())
