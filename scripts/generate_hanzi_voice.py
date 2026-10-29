"""Stage all hanzi recordings with the same Xiaoxiao voice before replacing assets."""

import argparse
import asyncio
import json
import subprocess
import tempfile
from pathlib import Path

from import_public_pinyin_audio import convert
from align_hanzi_context import single_span


ROOT = Path(__file__).resolve().parents[1]
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-5%'
# Homophones keep isolated polyphonic characters on the lesson's target tone.
CHARACTER_TEXT = {'长': '常', '几': '己', '子': '紫', '数': '鼠', '斗': '陡', '只': '枝', '地': '弟', '扒': '八', '当': '铛', '倒': '岛', '干': '赣', '吱': '兹',
                  '漂': '票', '处': '触', '弹': '谈', '觉': '叫', '稽': '鸡', '还': '孩', '擀': '敢', '脊': '己', '背': '贝', '模': '毪',
                  '分': '纷', '吐': '土', '喝': '呵', '什': '神', '了': 'lē'}
CHARACTER_CONTEXT = {'得': '你得先敲门。', '着': '排着队。', '的': '我的。',
                     '啊': '你好啊。', '啦': '再见啦。', '们': '朋友们，你好。', '吧': '回家吧。'}


def character_span(boundaries, title):
    matches = [item for item in boundaries if item['text'] == title]
    if len(matches) != 1:
        raise ValueError(f'{title}: expected one exact character boundary, not a phrase')
    word = matches[0]
    start, duration = word['offset'] / 1e7, word['duration'] / 1e7
    if not 0.10 <= duration <= 1.0:
        raise ValueError(f'{title}: invalid single-syllable duration {duration}')
    # Never extend into the neighbouring word; the old negative margin leaked its tail.
    return start, duration


def read_units():
    result = subprocess.run([
        'node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"
    ], cwd=ROOT, check=True, capture_output=True)
    return json.loads(result.stdout.decode('utf-8'))


def asset_path(unit, field):
    filename = unit[field]
    return Path(filename.lstrip('/') if filename.startswith('/') else f'assets/audio/{filename}')


async def generate_clip(unit, field, output_dir, ffmpeg, bitrate='32k'):
    character = field == 'characterAudioFile'
    target = output_dir / asset_path(unit, field)
    context = CHARACTER_CONTEXT.get(unit['title']) if character else None
    text = context or (CHARACTER_TEXT.get(unit['title'], unit['title']) if character else unit['phrase'])
    le_first_tone = character and unit['title'] == '了' and text == 'lē'
    rate = '+0%' if character and unit['title'] in ('长', '了') else RATE
    if character and not context and len(text) != 1 and not le_first_tone:
        raise ValueError('Character audio must contain one character, never its phrase or explanation')
    import edge_tts
    for attempt in range(3):
        try:
            with tempfile.TemporaryDirectory(prefix='curiocub-hanzi-voice-') as directory:
                source = Path(directory) / 'source.mp3'
                boundaries = []
                if context:
                    with source.open('wb') as output:
                        async for chunk in edge_tts.Communicate(text, voice=VOICE, rate=rate,
                                                               boundary='WordBoundary', receive_timeout=30).stream():
                            if chunk['type'] == 'audio': output.write(chunk['data'])
                            elif chunk['type'] == 'WordBoundary': boundaries.append(chunk)
                    character_span(boundaries, unit['title'])
                    start, duration = single_span(source, context, unit['title'])
                    cropped = Path(directory) / 'single.wav'
                    subprocess.run([str(ffmpeg), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source),
                                    '-ss', str(start), '-t', str(duration), str(cropped)], check=True)
                    source = cropped
                else:
                    await edge_tts.Communicate(text, voice=VOICE, rate=rate, receive_timeout=30).save(str(source))
                convert(ffmpeg, source, target, bitrate)
                metadata = {'id': unit['id'], 'title': unit['title'], 'pinyin': unit['pinyin'], 'voice': VOICE,
                            'rate': rate, 'text': text, 'singleCharacter': character, 'contextExtracted': bool(context)}
                if le_first_tone:
                    metadata.update(spokenPinyin='lē', syllable='le1')
                if context:
                    metadata.update(start=start, duration=duration, boundaryText=unit['title'], alignmentMethod='acoustic-v1')
                target.with_suffix('.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
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
