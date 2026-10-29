"""Generate the short, original voice clips used by CurioCub's first release."""

import asyncio
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "audio"
ZH_VOICE = "zh-CN-XiaoxiaoNeural"
EN_VOICE = ZH_VOICE

HANZI = [
    ("土", "泥土"), ("五", "五颗星"), ("中", "中间"), ("上", "树上"), ("天", "蓝天"),
    ("禾", "禾苗"), ("人", "一个人"), ("尺", "尺子"), ("头", "头顶"), ("下", "树下"),
    ("虫", "小虫"), ("把", "一把伞"), ("口", "张开口"), ("子", "孩子"), ("水", "水滴"),
    ("你", "你好"), ("山", "大山"), ("牙", "牙齿"), ("长", "长长的"), ("比", "比一比"),
    ("四", "四朵花"), ("西", "西边"), ("小", "小小的"), ("了", "天黑了"), ("手", "小手"),
    ("我", "我自己"), ("去", "去公园"), ("东", "东边"), ("心", "爱心"), ("必", "必须洗手"),
    ("女", "女孩"), ("力", "力气"), ("月", "月亮"), ("儿", "花儿"), ("巴", "尾巴"),
    ("几", "几块饼干"), ("九", "九颗糖果"), ("与", "你与我"), ("马", "小马"), ("鸟", "小鸟"),
]

PINYIN = ["啊", "喔", "鹅", "衣", "乌", "迂", "玻", "坡", "摸", "佛", "得", "特"]
MATH = [
    "数一数，有一颗星星", "数一数，有两只小鸟", "数一数，有三朵花", "数一数，有四条小鱼", "数一数，有五个苹果",
    "数一数，有六片叶子", "数一数，有七颗糖果", "数一数，有八个气球", "数一数，有九颗星星", "数一数，有十朵云",
    "一加一等于几", "二加一等于几", "二加二等于几", "三减一等于几", "四减一等于几", "五减二等于几",
]
ENGLISH = ["dog", "cat", "bird", "fish", "red", "blue", "yellow", "green", "apple", "banana", "orange", "grape"]


async def write_clip(filename: str, text: str, voice: str) -> None:
    target = OUTPUT / filename
    if target.exists() and target.stat().st_size > 0:
        return
    print(f"Creating {filename}")
    communicate = edge_tts.Communicate(text=text, voice=voice, rate="+0%")
    await communicate.save(str(target))


async def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    clips = []
    for index, (character, phrase) in enumerate(HANZI, start=1):
        number = f"{index:02d}"
        clips.extend([
            (f"hanzi-{number}-character.mp3", {"长": "常", "了": "lē"}.get(character, character), ZH_VOICE),
            (f"hanzi-{number}-phrase.mp3", phrase, ZH_VOICE),
        ])
    clips.extend((f"pinyin-{index:02d}.mp3", text, ZH_VOICE) for index, text in enumerate(PINYIN, start=1))
    clips.extend((f"math-{index:02d}.mp3", text, ZH_VOICE) for index, text in enumerate(MATH, start=1))
    clips.extend((f"english-{index:02d}.mp3", text, EN_VOICE) for index, text in enumerate(ENGLISH, start=1))

    for filename, text, voice in clips:
        await write_clip(filename, text, voice)


if __name__ == "__main__":
    asyncio.run(main())
