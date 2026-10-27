"""Map licensed first-stroke medians onto the bundled Kai outlines.

Source records: hanzi-writer-data 2.0.1, scripts/stroke-source, Arphic PL.
Only the first stroke is demonstrated; this is not handwriting scoring.
Requires fonttools and Pillow. Outputs normalized 1000-square board positions.
"""
import json
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent


def build():
    font = TTFont(ROOT / 'scripts/font-source/FandolKai-Regular.otf')
    glyphs = font.getGlyphSet()
    raster_font = ImageFont.truetype(str(ROOT / 'scripts/font-source/FandolKai-Regular.otf'), 1000)
    units = json.loads(subprocess.check_output(['node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"], cwd=ROOT).decode())
    guides = {}
    for unit in units:
        char = unit['title']
        source = json.loads((ROOT / 'scripts/stroke-source' / (char + '.json')).read_text(encoding='utf-8'))
        bounds = BoundsPen(None)
        for stroke in source['strokes']:
            parse_path(stroke, bounds)
        sx0, sy0, sx1, sy1 = bounds.bounds
        bounds = BoundsPen(glyphs)
        glyphs[font.getBestCmap()[ord(char)]].draw(bounds)
        x0, y0, x1, y1 = bounds.bounds
        mask = Image.new('L', (1600, 1600))
        ImageDraw.Draw(mask).text((300, 1100), char, font=raster_font, fill=255, anchor='ls')

        def align(point):
            x = x0 + (point[0] - sx0) / (sx1 - sx0) * (x1 - x0)
            y = y0 + (point[1] - sy0) / (sy1 - sy0) * (y1 - y0)
            px, py = round(x + 300), round(1100 - y)
            # Put the point inside the actual Kai ink, even when fonts differ slightly.
            nearest = None
            for radius in range(0, 121, 3):
                candidates = [(dx, dy) for dx in range(-radius, radius + 1, 3) for dy in range(-radius, radius + 1, 3)
                              if abs(dx) == radius or abs(dy) == radius]
                hits = [(dx, dy) for dx, dy in candidates if 0 <= px + dx < 1600 and 0 <= py + dy < 1600 and mask.getpixel((px + dx, py + dy)) > 180]
                if hits:
                    nearest = min(hits, key=lambda p: p[0] ** 2 + p[1] ** 2)
                    break
            assert nearest is not None, char
            x, y = px + nearest[0] - 300, 1100 - py - nearest[1]
            return [round(500 + .84 * (x - 500)), round(500 + .84 * (380 - y))]

        points = [align(point) for point in source['medians'][0]]
        guides[char] = { 'points': points, 'count': len(source['strokes']) }
    output = ROOT / 'packages/hanzi-practice/data'
    (output / 'stroke-guides.js').write_text('module.exports = ' + json.dumps(guides, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    shutil.copyfile(ROOT / 'scripts/stroke-source/ARPHICPL.TXT', output / 'ARPHICPL.txt')
    (output / 'STROKE_SOURCE.txt').write_text('First-stroke guides derived from hanzi-writer-data 2.0.1 (Make Me a Hanzi / Arphic fonts).\nLicense: ARPHICPL.txt.\nModified: first stroke only, coordinates aligned to FandolKai outlines.\nSource: https://github.com/chanind/hanzi-writer-data\n', encoding='utf-8')
    print('Built', len(guides), 'first-stroke guides')


if __name__ == '__main__':
    build()
