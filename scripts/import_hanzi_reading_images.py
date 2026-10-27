"""Import generated reading hints and reuse appropriate existing illustrations."""

import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / 'scripts'


def main():
    manifests = [json.loads((SCRIPTS / name).read_text('utf-8')) for name in
                 ['hanzi-reading-images.json', 'hanzi-reading-images-2.json']]
    assets = {asset['key']: asset for manifest in manifests for asset in manifest}
    vocabulary = sum([json.loads((SCRIPTS / name).read_text('utf-8')) for name in
                      ['hanzi-reading-vocabulary.json', 'hanzi-reading-vocabulary-2.json']], [])
    result = subprocess.run(['node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"],
                            cwd=ROOT, check=True, capture_output=True)
    units = json.loads(result.stdout.decode('utf-8'))
    original = {unit['title']: ROOT / unit['imageFile'].lstrip('/') for unit in units[:78]}
    imported = {}
    for unit, row in zip(units[78:], vocabulary, strict=True):
        key = row[3]
        source = original[key[1:]] if key.startswith('@') else Path(assets[key]['source'])
        target = ROOT / unit['imageFile'].lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            image = image.convert('RGBA').resize((128, 128), Image.Resampling.LANCZOS)
            assert image.getpixel((0, 0))[3] == 0, f'{key}: expected transparent corner'
            image.save(target, optimize=True)
        imported[key] = target
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 15)
    for index, manifest in enumerate(manifests, 1):
        sheet = Image.new('RGB', (7 * 150, ((len(manifest) + 6) // 7) * 166), '#fffaf2')
        draw = ImageDraw.Draw(sheet)
        for i, asset in enumerate(manifest):
            x, y = (i % 7) * 150, (i // 7) * 166
            with Image.open(imported[asset['key']]) as image:
                sheet.paste(image, (x + 11, y + 4), image)
            characters = ''.join(row[0] for row in vocabulary if row[3] == asset['key'])
            draw.text((x + 7, y + 135), characters, font=font, fill='#493a30')
        sheet.save(SCRIPTS / f'hanzi-reading-preview-{index}.png')
    print(f'Imported {len(vocabulary)} card hints using {len(assets)} new illustrations and appropriate existing assets.')


if __name__ == '__main__':
    main()
