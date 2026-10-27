"""Stage all hanzi recordings with the same Xiaoxiao voice before replacing assets."""

import argparse
import asyncio
import json
import subprocess
import tempfile
from pathlib import Path

from import_public_pinyin_audio import convert


ROOT = Path(__file__).resolve().parents[1]
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-5%'
# Homophones keep isolated polyphonic characters on the lesson's target tone.
CHARACTER_TEXT = {'长': '常', '几': '己', '子': '紫', '数': '鼠', '斗': '陡', '只': '枝', '地': '弟', '扒': '八', '当': '铛', '倒': '岛', '干': '赣', '吱': '兹',
                  '漂': '票', '处': '触', '弹': '谈', '觉': '叫', '稽': '鸡', '还': '孩', '擀': '敢', '脊': '己', '背': '贝', '模': '毪'}


def read_units():
    result = subprocess.run([
        'node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"
    ], cwd=ROOT, check=True, capture_output=True)
    return json.loads(result.stdout.decode('utf-8'))


def asset_path(unit, field):
    filename = unit[field]
    return Path(filename.lstrip('/') if filename.startswith('/') else f'assets/audio/{filename}')


async def generate_clip(unit, field, output_dir, ffmpeg, bitrate='32k'):
    import edge_tts

    character = field == 'characterAudioFile'
    # Sentence context fixes 得 and neutral-tone characters; retain only that word.
    context = {'了': '天黑了。', '得': '你得先敲门。', '着': '排着队。', '谁': '谁在拉车？', '的': '我的。', '啊': '你好啊。', '啦': '再见啦。', '们': '朋友们，你好。', '吧': '回家吧。'}
    extract_character = character and unit['title'] in context
    text = context.get(unit['title'], CHARACTER_TEXT.get(unit['title'], unit['title'])) if character else unit['phrase']
    target = output_dir / asset_path(unit, field)
    for attempt in range(3):
        try:
            with tempfile.TemporaryDirectory(prefix='curiocub-hanzi-voice-') as directory:
                source = Path(directory) / 'source.mp3'
                boundaries = []
                with source.open('wb') as output:
                    async for chunk in edge_tts.Communicate(
                        text, voice=VOICE, rate=RATE, boundary='WordBoundary', receive_timeout=30
                    ).stream():
                        if chunk['type'] == 'audio':
                            output.write(chunk['data'])
                        elif chunk['type'] == 'WordBoundary':
                            boundaries.append(chunk)
                if extract_character:
                    boundary = next(item for item in boundaries if item['text'] == unit['title'])
                    cropped = Path(directory) / 'character.wav'
                    start = max(0, boundary['offset'] / 1e7 - 0.025)
                    duration = boundary['duration'] / 1e7 + 0.09
                    subprocess.run([
                        str(ffmpeg), '-y', '-hide_banner', '-loglevel', 'error',
                        '-i', str(source), '-ss', str(start), '-t', str(duration), str(cropped)
                    ], check=True)
                    source = cropped
                convert(ffmpeg, source, target, bitrate)
            print(f"Ready {unit['id']} {'character' if character else 'phrase'}", flush=True)
            return
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(attempt + 1)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True, help='Staging directory; existing project audio is left untouched')
    parser.add_argument('--start-id', type=int, default=1, help='First hanzi number to generate; 79 preserves the original recordings')
    parser.add_argument('--skip-existing', action='store_true', help='Resume without replacing completed recordings')
    args = parser.parse_args()
    semaphore = asyncio.Semaphore(3)

    async def limited(unit, field):
        target = args.output_dir / asset_path(unit, field)
        if args.skip_existing and target.is_file() and target.stat().st_size > 0:
            return
        async with semaphore:
            await generate_clip(unit, field, args.output_dir, args.ffmpeg)

    units = read_units()[args.start_id - 1:]
    await asyncio.gather(*(limited(unit, field) for unit in units for field in ('characterAudioFile', 'phraseAudioFile')))
    print(f'Generated {len(units) * 2} recordings with {VOICE}, rate {RATE}.', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
