"""Generate short, single-reading button sounds for the pinyin learning machine."""

import asyncio
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets' / 'audio' / 'pinyin-basic'
VOICE = 'zh-CN-YunxiaNeural'
RATE = '-10%'
PITCH = '+2Hz'

INITIAL_READINGS = {
    'b': '播', 'p': '坡', 'm': '摸', 'f': '佛',
    'd': '得', 't': '特', 'n': '呢', 'l': '勒',
    'g': '哥', 'k': '科', 'h': '喝',
    'j': '鸡', 'q': '七', 'x': '西',
    'zh': '知', 'ch': '吃', 'sh': '师', 'r': '日',
    'z': '资', 'c': '雌', 's': '思', 'y': '衣', 'w': '乌'
}

FINAL_READINGS = {
    'a': '啊', 'o': '喔', 'e': '鹅', 'i': '衣', 'u': '乌', 'ü': '迂',
    'ai': '哀', 'ei': '诶', 'ui': '威', 'ao': '凹', 'ou': '欧',
    'iu': '优', 'ie': '椰', 'üe': '约', 'er': '儿',
    'an': '安', 'en': '恩', 'in': '因', 'un': '温', 'ün': '晕',
    'ang': '肮', 'eng': '鞥', 'ing': '英', 'ong': '嗡'
}


def filename(kind, value):
    return f'{kind}-{value.replace("ü", "v")}.mp3'


async def create_clip(kind, value, reading, semaphore):
    target = OUTPUT / filename(kind, value)
    async with semaphore:
        for attempt in range(3):
            try:
                text = f'{reading}。'
                communicate = edge_tts.Communicate(text, voice=VOICE, rate=RATE, pitch=PITCH)
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
        *(create_clip('initial', value, reading, semaphore) for value, reading in INITIAL_READINGS.items()),
        *(create_clip('final', value, reading, semaphore) for value, reading in FINAL_READINGS.items())
    ]
    await asyncio.gather(*clips)
    print(f'Created {len(clips)} short pinyin button sounds with {VOICE}.')


if __name__ == '__main__':
    asyncio.run(main())
