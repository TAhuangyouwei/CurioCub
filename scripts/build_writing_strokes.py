"""Bundle all licensed stroke outlines and medians in matching coordinates.

Paths use Canvas commands, quantized to a 250-square grid and base64 packed.
The resulting resource is offline and does not depend on Path2D or device fonts.
"""
import base64
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def build():
    units = json.loads(subprocess.check_output([
        'node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"
    ], cwd=ROOT).decode())
    result = {}
    for unit in units:
        source = json.loads((ROOT / 'scripts/stroke-source' / (unit['title'] + '.json')).read_text(encoding='utf-8'))
        paths = []
        for path in source['strokes']:
            tokens = re.findall(r'[A-Za-z]|-?\d+(?:\.\d+)?', path)
            commands = []
            i = 0
            while i < len(tokens):
                command = tokens[i]
                size = {'M': 2, 'L': 2, 'Q': 4, 'C': 6, 'Z': 0}[command]
                commands.append((command, [float(v) for v in tokens[i + 1:i + 1 + size]]))
                i += size + 1
            paths.append(commands)
        coords = [coords for path in paths for _, coords in path]
        xs = [v for values in coords for v in values[::2]]
        ys = [v for values in coords for v in values[1::2]]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        scale = 200 / max(x1 - x0, y1 - y0)

        def point(p):
            return [max(0, min(250, round(125 + (p[0] - (x0 + x1) / 2) * scale))),
                    max(0, min(250, round(125 - (p[1] - (y0 + y1) / 2) * scale)))]

        outlines = []
        for path in paths:
            packed = []
            for command, values in path:
                packed.append({'M': 251, 'L': 252, 'Q': 253, 'C': 254, 'Z': 255}[command])
                for i in range(0, len(values), 2):
                    packed.extend(point(values[i:i + 2]))
            outlines.append(base64.b64encode(bytes(packed)).decode())
        medians = [base64.b64encode(bytes(v for p in stroke for v in point(p))).decode() for stroke in source['medians']]
        result[unit['title']] = [outlines, medians]
    output = ROOT / 'packages/hanzi-writing/data'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'strokes.js').write_text('module.exports = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    shutil.copyfile(ROOT / 'scripts/stroke-source/ARPHICPL.TXT', output / 'ARPHICPL.txt')
    (output / 'STROKE_SOURCE.txt').write_text(
        'All stroke outlines and medians derived from hanzi-writer-data 2.0.1 (Make Me a Hanzi / Arphic fonts).\n'
        'License: ARPHICPL.txt. Modified: centered, uniformly scaled and quantized to a 250-square grid.\n'
        'Source: https://github.com/chanind/hanzi-writer-data\n', encoding='utf-8')
    print('Built full stroke outlines and medians for', len(result), 'characters')


if __name__ == '__main__':
    build()
