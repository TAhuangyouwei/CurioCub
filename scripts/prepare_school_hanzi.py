"""Prepare October weeks 3–4 additions, keeping every existing resource intact.

Requires Pillow, edge-tts and ffmpeg. Stroke data keeps the project's pinned
hanzi-writer-data 2.0.1 source and Arphic license. Atlas is generated artwork.
"""
import argparse
import asyncio
import io
import json
from pathlib import Path
import subprocess
import tarfile
from urllib.request import urlopen

from PIL import Image
from generate_hanzi_voice import generate_clip, CHARACTER_TEXT

ROOT = Path(__file__).resolve().parent.parent


def units():
    return json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items.slice(458)))"], cwd=ROOT).decode('utf-8'))


def prepare_art(atlas, added):
    image = Image.open(atlas).convert('RGBA')
    # Crops follow actual atlas spacing rather than cutting off tall subjects.
    boxes = [(0, 30, 276, 361), (274, 30, 515, 361), (515, 30, 770, 361),
             (770, 30, 974, 361), (975, 30, 1280, 361),
             (0, 365, 275, 651), (275, 365, 514, 651), (514, 365, 774, 651),
             (775, 365, 986, 651), (987, 365, 1280, 651),
             (0, 652, 270, 924), (271, 652, 508, 924), (510, 652, 755, 924),
             (756, 652, 1009, 924), (1010, 652, 1280, 924),
             (0, 925, 258, 1280), (259, 925, 555, 1280)]
    for unit, box in zip(added, boxes):
        crop = image.crop(box)
        bounds = crop.getbbox()
        if bounds:
            crop = crop.crop(bounds)
        crop.thumbnail((120, 120), Image.Resampling.LANCZOS)
        final = Image.new('RGBA', (128, 128))
        final.alpha_composite(crop, ((128 - crop.width) // 2, (128 - crop.height) // 2))
        target = ROOT / unit['imageFile'].lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        final.quantize(colors=64).save(target, optimize=True)


def prepare_strokes(added):
    missing = [unit for unit in added if not (ROOT / 'scripts/stroke-source' / (unit['title'] + '.json')).exists()]
    if not missing:
        return
    url = 'https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz'
    with urlopen(url, timeout=60) as response:
        raw = response.read()
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
        for unit in missing:
            name = unit['title'] + '.json'
            raw = archive.extractfile('package/' + name).read()
            data = json.loads(raw)
            assert data['strokes'] and len(data['strokes']) == len(data['medians'])
            (ROOT / 'scripts/stroke-source' / name).write_bytes(raw)


async def prepare_audio(added, ffmpeg):
    CHARACTER_TEXT.update({'分': '纷', '吐': '土', '喝': '呵'})
    semaphore = asyncio.Semaphore(3)

    async def clip(unit, field):
        target = ROOT / unit[field].lstrip('/')
        if target.exists() and target.stat().st_size:
            return
        async with semaphore:
            await generate_clip(unit, field, ROOT, ffmpeg, bitrate='16k')

    await asyncio.gather(*(clip(unit, field) for unit in added for field in ['characterAudioFile', 'phraseAudioFile']))
    for unit in added:
        target = ROOT / 'packages/hanzi-practice/audio' / (unit['id'] + '.mp3')
        source = ROOT / unit['characterAudioFile'].lstrip('/')
        if target.exists() and target.stat().st_size:
            continue
        subprocess.run([str(ffmpeg), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source),
                        '-ar', '24000', '-ac', '1', '-b:a', '16k', '-map_metadata', '-1', str(target)], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--atlas', type=Path)
    parser.add_argument('--ffmpeg', type=Path)
    options = parser.parse_args()
    added = units()
    if options.atlas:
        prepare_art(options.atlas, added)
        prepare_strokes(added)
    if options.ffmpeg:
        asyncio.run(prepare_audio(added, options.ffmpeg))
