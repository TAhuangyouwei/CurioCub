"""Decode offline reading audio and check that silence trimming preserved speech."""
from array import array
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/english-audio-runtime'))
import imageio_ffmpeg


def measure(path):
    result = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error',
                             '-i', str(path), '-ar', '16000', '-ac', '1', '-f', 'f32le', '-'],
                            capture_output=True, check=True)
    samples = array('f')
    samples.frombytes(result.stdout)
    return len(samples) / 16000, sum(abs(sample) > 0.01 for sample in samples) / 16000, sum(sample * sample for sample in samples)


def main():
    data = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify({units:require('./data/learning').getModule('hanzi').items,sentences:require('./packages/hanzi-practice/data/reading').sentences.filter(x=>x.endStation)}))"], cwd=ROOT).decode('utf-8'))
    def character(unit):
        source = unit['characterAudioFile']
        source = ROOT / (source.lstrip('/') if source.startswith('/') else 'assets/audio/' + source)
        _, original, original_energy = measure(source)
        duration, audible, energy = measure(ROOT / 'packages/hanzi-practice/audio' / (unit['id'] + '.mp3'))
        if duration < 0.18 or audible < 0.04 or audible < original * 0.85:
            return f"{unit['id']} {ascii(unit['title'])}: duration={duration:.3f}, speech={audible:.3f}, original={original:.3f}, energy={energy/original_energy:.3f}"

    def sentence_clip(sentence):
        duration, audible, _ = measure(ROOT / sentence['audio'].lstrip('/'))
        if duration < 0.6 or audible < 0.15:
            return f"{ascii(sentence['text'])}: duration={duration:.3f}, speech={audible:.3f}"

    with ThreadPoolExecutor(max_workers=4) as pool:
        failures = list(filter(None, pool.map(character, data['units'])))
        failures += list(filter(None, pool.map(sentence_clip, data['sentences'])))
    assert not failures, '\n'.join(failures)
    print(f"Audio check passed: {len(data['units'])} character clips preserve audible speech; {len(data['sentences'])} new sentence recordings decode correctly.")


if __name__ == '__main__':
    main()
