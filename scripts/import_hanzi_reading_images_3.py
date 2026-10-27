"""Import the third photo batch's real illustrations and reuse matching existing art."""
import argparse
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent


def main(partial=False):
    old = json.loads((ROOT / 'scripts/hanzi-before-import-3.json').read_text(encoding='utf-8'))
    previous = {unit['title']: ROOT / unit['imageFile'].lstrip('/') for unit in old}
    rows = [line.split('\t') for line in (ROOT / 'scripts/hanzi-reading-vocabulary-3.tsv').read_text(encoding='utf-8').splitlines() if line]
    generated = [json.loads(line) for line in (ROOT / 'scripts/hanzi-reading-generated-3.jsonl').read_text(encoding='utf-8-sig').splitlines() if line]
    assets = {}
    for asset in generated:
        asset['source'] = asset['source'].split(' as ')[-1]
        asset['generator'] = 'built-in image_gen'
        asset['transparentBackground'] = True
        assert Path(asset['source']).is_file(), asset['key']
        assets[asset['key']] = asset
    units = json.loads(subprocess.check_output(['node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items.slice(302)))"], cwd=ROOT).decode('utf-8'))
    missing = set()
    imported = {}
    count = 0
    for unit, row in zip(units, rows, strict=True):
        key = row[3]
        if key.startswith('@'):
            source = previous[key[1:]]
        elif key in assets:
            source = Path(assets[key]['source'])
        else:
            missing.add(key)
            continue
        target = ROOT / unit['imageFile'].lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            image = image.convert('RGBA').resize((128, 128), Image.Resampling.LANCZOS)
            assert image.getpixel((0, 0))[3] == 0, key
            image.save(target, optimize=True)
        imported[key] = target
        count += 1
    if missing and not partial:
        raise AssertionError('Missing illustrations: ' + ', '.join(sorted(missing)))
    (ROOT / 'scripts/hanzi-reading-images-3.json').write_text(json.dumps(list(assets.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    keys = list(dict.fromkeys(row[3] for row in rows if row[3] in imported))
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 15)
    sheet = Image.new('RGB', (7 * 150, ((len(keys) + 6) // 7) * 166), '#fffaf2')
    draw = ImageDraw.Draw(sheet)
    for index, key in enumerate(keys):
        x, y = (index % 7) * 150, (index // 7) * 166
        with Image.open(imported[key]) as image:
            sheet.paste(image, (x + 11, y + 4), image)
        label = ''.join(row[0] for row in rows if row[3] == key)
        draw.text((x + 5, y + 135), label, font=font, fill='#493a30')
    sheet.save(ROOT / 'scripts/hanzi-reading-preview-3.png')
    print(f'Imported {count}/{len(rows)} card hints; {len(assets)} new scenes ready; {len(missing)} pending.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--partial', action='store_true', help='Preview completed artwork while remaining generation is running')
    main(parser.parse_args().partial)
