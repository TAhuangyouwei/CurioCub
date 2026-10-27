"""Check offline hanzi audio and guard against trimming at an internal pause."""

import argparse
from array import array
import json
from pathlib import Path
import subprocess

from generate_hanzi_extra_audio import ROOT
from import_public_pinyin_audio import AUDIO_FILTER


def decode(ffmpeg, source):
    result = subprocess.run([
        str(ffmpeg), '-hide_banner', '-loglevel', 'error', '-i', str(source),
        '-f', 's16le', '-ar', '24000', '-ac', '1', 'pipe:1',
    ], check=True, capture_output=True)
    samples = array('h', result.stdout)
    duration = len(samples) / 24000
    audible = sum(abs(sample) > 300 for sample in samples) / 24000
    return duration, audible


def check_internal_pause(ffmpeg):
    # Both character and phrase generation use convert() and this shared filter.
    for name, signal, minimum in [
        ('internal pause', r'if(between(t\,0\,0.3)+between(t\,0.5\,0.8)\,0.2*sin(2*PI*440*t)\,0)', 0.75),
        ('quiet onset', r'if(lt(t\,0.2)\,0.001\,0.2)*sin(2*PI*440*t)', 0.95),
    ]:
        result = subprocess.run([
            str(ffmpeg), '-hide_banner', '-loglevel', 'error',
            '-f', 'lavfi', '-i',
            f'aevalsrc={signal}:s=24000:d=1',
            '-af', AUDIO_FILTER, '-f', 's16le', '-ac', '1', 'pipe:1',
        ], check=True, capture_output=True)
        duration = len(result.stdout) / 2 / 24000
        assert duration >= minimum, f'{name}: audio truncated to {duration:.3f}s'


def check_assets(ffmpeg, audio_root=ROOT):
    result = subprocess.run(['node', '-e', "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"],
                            cwd=ROOT, check=True, capture_output=True)
    units = json.loads(result.stdout.decode('utf-8'))
    failures = []
    for unit in units:
        for field, text in [('characterAudioFile', unit['title']), ('phraseAudioFile', unit['phrase'])]:
            filename = unit[field]
            source = audio_root / (filename.lstrip('/') if filename.startswith('/') else f'assets/audio/{filename}')
            duration, audible = decode(ffmpeg, source)
            if duration < 0.18 * len(text) or audible < 0.06 * len(text):
                failures.append(f'{unit["id"]} {text}: duration={duration:.3f}s, audible={audible:.3f}s')
    assert not failures, 'Silent or suspiciously short recordings:\n' + '\n'.join(failures)
    print(f'Checked {len(units) * 2} hanzi recordings: decodable, audible, and minimum duration met.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--assets-only', action='store_true')
    parser.add_argument('--audio-root', type=Path, default=ROOT, help='Optional staged audio root to validate before replacement')
    args = parser.parse_args()
    if not args.assets_only:
        check_internal_pause(args.ffmpeg)
        print('Internal-pause regression checks passed for character and phrase generation.')
    check_assets(args.ffmpeg, args.audio_root)
