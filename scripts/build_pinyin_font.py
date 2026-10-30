"""Create an offline teaching font from CurioCub's original pinyin stroke drawings.

First run build_pinyin_font.js using @napi-rs/canvas, then this file using fonttools.
The deployed app contains only the generated small font, with no runtime dependency.
"""
import base64
import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/pinyin-font-runtime'))
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont


def main():
    data = json.loads((ROOT / 'scripts/stage-reading-audio/pinyin-font-outlines.json').read_text(encoding='utf-8'))
    builder = FontBuilder(1000, isTTF=True)
    glyphs = {'.notdef': TTGlyphPen(None).glyph(), 'space': TTGlyphPen(None).glyph()}
    cmap = {32: 'space'}
    for item in data:
        name = f"uni{ord(item['char']):04X}"
        pen = TTGlyphPen(None)
        parse_path(item['outline'], Cu2QuPen(pen, 0.5, reverse_direction=True))
        glyphs[name] = pen.glyph()
        cmap[ord(item['char'])] = name
    cmap[ord('ɑ')] = cmap[ord('a')]
    cmap[ord('ɡ')] = cmap[ord('g')]
    builder.setupGlyphOrder(list(glyphs))
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    for glyph in glyphs.values():
        glyph.recalcBounds(glyphs)
    builder.setupHorizontalMetrics({name: (760 if name != 'space' else 300, getattr(glyph, 'xMin', 0)) for name, glyph in glyphs.items()})
    builder.setupHorizontalHeader(ascent=850, descent=-400)
    builder.setupNameTable({'familyName': 'CurioCub Pinyin Hand', 'styleName': 'Regular',
                            'uniqueFontIdentifier': 'CurioCubPinyinHand-Regular', 'fullName': 'CurioCub Pinyin Hand Regular',
                            'psName': 'CurioCubPinyinHand-Regular', 'version': 'Version 1.0',
                            'copyright': 'Original CurioCub pinyin teaching paths.'})
    builder.setupOS2(sTypoAscender=850, sTypoDescender=-400, usWinAscent=850, usWinDescent=400)
    builder.setupPost()
    builder.setupMaxp()
    buffer = io.BytesIO()
    builder.save(buffer)
    payload = buffer.getvalue()
    checked = TTFont(io.BytesIO(payload))
    assert set(checked.getBestCmap()) == set(cmap)
    target = ROOT / 'assets/fonts/pinyin-hand.js'
    source = 'url("data:font/ttf;base64,' + base64.b64encode(payload).decode('ascii') + '")'
    target.write_text('// Generated from the same original strokes as the pinyin tracing page.\nmodule.exports = ' + json.dumps(source) + '\n', encoding='utf-8')
    (ROOT / 'scripts/stage-reading-audio/pinyin-hand.ttf').write_bytes(payload)
    print(f'Built pinyin handwriting font: {len(payload)} bytes, {len(cmap)} supported characters.')


if __name__ == '__main__':
    main()
