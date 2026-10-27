"""Build offline Kai subsets without duplicating the full Chinese font in the main package.
Requires fonttools[woff] and Node.js. Original source/license: scripts/font-source.
"""
import base64
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
from collections import defaultdict

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts/font-source"


def build_subset(characters, original, target):
    font = TTFont(io.BytesIO(original), recalcTimestamp=False)
    source_font = TTFont(io.BytesIO(original))
    source_glyphs = source_font.getGlyphSet()
    source_cmap = source_font.getBestCmap()
    assert not set(map(ord, characters)) - set(source_cmap), "Missing source glyph"
    options = subset.Options()
    options.hinting = False
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=characters)
    subsetter.subset(font)
    font.flavor = "woff2"
    buffer = io.BytesIO()
    font.save(buffer)
    payload = buffer.getvalue()
    packed = TTFont(io.BytesIO(payload))
    cmap = packed.getBestCmap()
    assert set(cmap) == set(map(ord, characters))
    glyphs = packed.getGlyphSet()
    for char in characters:
        pen = BoundsPen(glyphs)
        glyphs[cmap[ord(char)]].draw(pen)
        assert pen.bounds and pen.bounds[2] > pen.bounds[0] and pen.bounds[3] > pen.bounds[1], char
        before, after = DecomposingRecordingPen(source_glyphs), DecomposingRecordingPen(glyphs)
        source_glyphs[source_cmap[ord(char)]].draw(before)
        glyphs[cmap[ord(char)]].draw(after)
        assert before.value == after.value, f"Outline changed: {char}"
    target.parent.mkdir(parents=True, exist_ok=True)
    encoded = base64.b64encode(payload).decode("ascii")
    ranges = ",".join(f"U+{ord(char):04X}" for char in characters)
    target.write_text(
        '@font-face {\n  font-family: "CurioCubKai";\n'
        f'  src: url("data:font/woff2;base64,{encoded}") format("woff2");\n'
        f'  unicode-range: {ranges};\n'
        '  font-style: normal;\n  font-weight: 400;\n  font-display: block;\n}\n',
        encoding="utf-8",
    )
    return {"file": target.relative_to(ROOT).as_posix(), "characters": characters,
            "sha256": hashlib.sha256(payload).hexdigest()}


def build():
    units = json.loads(subprocess.check_output(["node", "-e",
        "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"],
        cwd=ROOT).decode("utf-8"))
    assert all(len(unit["title"]) == 1 for unit in units)
    original = (SOURCE / "FandolKai-Regular.otf").read_bytes()
    groups = defaultdict(list)
    for unit in units:
        groups[unit["packageName"]].append(unit["title"])
    files = []
    for package, titles in groups.items():
        target = ROOT / (f"packages/{package}/fonts/hanzi-kai.wxss" if package else "assets/fonts/hanzi-kai.wxss")
        files.append(build_subset("".join(sorted(set(titles))), original, target))
    # Daily practice and tracing can show every character; main-package glyphs are inherited.
    practice = "".join(sorted({unit["title"] for unit in units if unit["packageName"]}))
    files.append(build_subset(practice, original, ROOT / "packages/hanzi-practice/fonts/hanzi-kai.wxss"))
    shutil.copyfile(SOURCE / "COPYING", ROOT / "assets/fonts/LICENSE.txt")
    (ROOT / "assets/fonts/NOTICE.txt").write_text(
        "CurioCubKai: character subsets of FandolKai-Regular, by the Fandol team (Clerk Ma and Jie Su).\n"
        "Source: https://ctan.org/pkg/fandol\n"
        "License: GNU GPL version 3 or later, with font embedding exception; see LICENSE.txt.\n"
        "Modification: character subsets, no hint data, WOFF2 compression; outlines unchanged.\n"
        "The embedding exception also applies to these subsets.\n"
        "Main-package glyphs are shared; subpackages include only the additional glyphs they use.\n"
        "Source and reproducible tool: scripts/font-source and scripts/build_hanzi_font.py.\n",
        encoding="utf-8",
    )
    characters = "".join(sorted({unit["title"] for unit in units}))
    (SOURCE / "hanzi-kai.json").write_text(json.dumps({
        "characters": characters, "sourceSha256": hashlib.sha256(original).hexdigest(), "files": files
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built and verified {len(characters)} glyphs in {len(files)} offline font subsets.")


if __name__ == "__main__":
    build()
