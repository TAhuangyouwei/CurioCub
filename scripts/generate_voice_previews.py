"""Create short, comparable local voice previews for the CurioCub family."""

import asyncio
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets' / 'audio' / 'voice-previews'
TEXT = '好，好朋友。欢迎来到 CurioCub。我们一起快乐学拼读。'
VOICES = [
    ('01-xiaoyi-lively.mp3', 'zh-CN-XiaoyiNeural', '-10%', '+2Hz'),
    ('02-yunxia-cute.mp3', 'zh-CN-YunxiaNeural', '-10%', '+2Hz'),
    ('03-yunxi-sunshine.mp3', 'zh-CN-YunxiNeural', '-8%', '+0Hz'),
]


async def create_preview(filename, voice, rate, pitch):
    target = OUTPUT / filename
    communicate = edge_tts.Communicate(TEXT, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(str(target))
    print(f'Created {target}')


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    await asyncio.gather(*(create_preview(*voice) for voice in VOICES))


if __name__ == '__main__':
    asyncio.run(main())
