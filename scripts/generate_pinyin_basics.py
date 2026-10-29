"""Stage short pinyin button sounds for review without changing product audio."""

import asyncio
import shutil
from pathlib import Path

import edge_tts
from xiaoxiao_pinyin import VOICE, RATE, PITCH, APPROVED_SOURCES, FINAL_SYLLABLES, basic_key, spoken_pinyin
from import_public_pinyin_audio import INITIAL_SOURCES


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'scripts/audio-audit/pinyin-generation-stage/assets/audio/pinyin-basic'

def filename(kind, value):
    return f'{kind}-{value.replace("ü", "v")}.mp3'


async def create_clip(kind, value, semaphore):
    target = OUTPUT / filename(kind, value)
    async with semaphore:
        for attempt in range(3):
            try:
                key = basic_key(kind, value)
                source = APPROVED_SOURCES.get(key)
                if source:
                    shutil.copyfile(source, target)
                else:
                    communicate = edge_tts.Communicate(spoken_pinyin(key), voice=VOICE, rate=RATE, pitch=PITCH)
                    await communicate.save(str(target))
                if target.stat().st_size <= 1000:
                    raise RuntimeError('generated file is unexpectedly small')
                return
            except Exception:
                if target.exists():
                    target.unlink()
                if attempt == 2:
                    raise
                await asyncio.sleep(attempt + 1)


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(4)
    clips = [
        *(create_clip('initial', value, semaphore) for value in INITIAL_SOURCES),
        *(create_clip('final', value, semaphore) for value in FINAL_SYLLABLES)
    ]
    await asyncio.gather(*clips)
    print(f'Created {len(clips)} short pinyin button sounds with {VOICE}.')


if __name__ == '__main__':
    asyncio.run(main())
