"""Verify the offline handwriting font against the original tracing geometry."""
import base64
import io
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/pinyin-font-runtime'))
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

source = (ROOT / 'assets/fonts/pinyin-hand.js').read_text(encoding='utf-8')
payload = base64.b64decode(re.search(r'data:font/ttf;base64,([A-Za-z0-9+/=]+)', source)[1])
font = TTFont(io.BytesIO(payload))
cmap = font.getBestCmap()
assert set(cmap) == set(map(ord, 'abcdefghijklmnopqrstuwxyzüɑɡ '))
assert cmap[ord('a')] == cmap[ord('ɑ')] and cmap[ord('g')] == cmap[ord('ɡ')]
data = json.loads(subprocess.check_output(['node', '-e',
    "const {guideFor}=require('./packages/pinyin-basic-v2/data/writing');process.stdout.write(JSON.stringify([...'abcdefghijklmnopqrstuwxyzü'].map(c=>({c,points:guideFor(c).strokes.flatMap(s=>s.points)}))))"], cwd=ROOT).decode('utf-8'))
glyphs = font.getGlyphSet()
for item in data:
    name = cmap[ord(item['c'])]
    pen = BoundsPen(glyphs)
    glyphs[name].draw(pen)
    points = item['points']
    bounds = (min(p[0] for p in points)*10-25, 800-max(p[1] for p in points)*10-25,
              max(p[0] for p in points)*10+25, 800-min(p[1] for p in points)*10+25)
    assert all(abs(a-b) < 2 for a, b in zip(pen.bounds, bounds)), item['c']
    assert font['hmtx'][name] == (760, font['glyf'][name].xMin)
print(f'Pinyin font check passed: {len(data)} original letters, single-storey a/g aliases, matching trace bounds and offline font ({len(payload)} bytes).')

# Joined strokes form counters in these letters. The inner contour must have the
# opposite winding, otherwise a valid font file can still show a solid blob.
for letter in 'abdgopq':
    glyph = font['glyf'][cmap[ord(letter)]]
    areas, first = [], 0
    for last in glyph.endPtsOfContours:
        contour = list(glyph.coordinates[first:last + 1])
        areas.append(sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(contour, contour[1:] + contour[:1])))
        first = last + 1
    assert min(areas) < 0 < max(areas), letter + ' lost its counter'
