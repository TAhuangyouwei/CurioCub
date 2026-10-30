"""Stage the 138 new vocabulary recordings; existing product recordings stay intact."""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import av
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/english-audio-runtime'))
import edge_tts
import imageio_ffmpeg

STAGE = ROOT / 'scripts/english-audio'
VOICE = 'zh-CN-XiaoxiaoNeural'
# The action card uses present-tense /ri:d/, not past-tense /red/.
SPOKEN_TEXT = {'read': 'reed'}


def decode(file):
    chunks = []
    resampler = av.AudioResampler(format='fltp', layout='mono', rate=24000)
    with av.open(str(file)) as media:
        for frame in media.decode(audio=0):
            chunks.extend(frame.to_ndarray().reshape(-1) for frame in resampler.resample(frame))
        chunks.extend(frame.to_ndarray().reshape(-1) for frame in resampler.resample(None))
    return np.concatenate(chunks)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--words', nargs='*', help='Generate a pronunciation sample or resume selected words')
    parser.add_argument('--bitrate', default='24k')
    args = parser.parse_args()
    data = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify(require('./data/english-vocabulary').words))"], cwd=ROOT).decode('utf-8'))
    words = [word for word in data if not word['legacyId'] and (not args.words or word['id'] in args.words)]
    (STAGE / 'raw').mkdir(parents=True, exist_ok=True)
    (STAGE / 'clips').mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(3)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    async def clip(word):
        async with semaphore:
            key = word['id']
            raw = STAGE / 'raw' / f'{key}.mp3'
            target = STAGE / 'clips' / f'{key}.mp3'
            text = SPOKEN_TEXT.get(key, word['word'])
            if not raw.exists() or not raw.stat().st_size:
                for attempt in range(3):
                    try:
                        await edge_tts.Communicate(text, voice=VOICE, rate='+0%',
                            connect_timeout=10, receive_timeout=30).save(str(raw))
                        break
                    except Exception:
                        if attempt == 2:
                            raise
                        await asyncio.sleep(attempt + 1)
            samples = decode(raw)
            voiced = np.flatnonzero(np.abs(samples) > .0005)
            assert len(voiced) > 100 and np.isfinite(samples).all(), f'Silent or invalid source: {key}'
            # Keep the full voiced span, 60 ms onset margin and 120 ms combined tail buffer.
            start = max(0, voiced[0] / 24000 - .06)
            end = min(len(samples) / 24000, voiced[-1] / 24000 + .08)
            subprocess.run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(raw),
                '-af', f'atrim=start={start:.6f}:end={end:.6f},asetpts=PTS-STARTPTS,apad=pad_dur=0.04',
                '-ar', '24000', '-ac', '1', '-b:a', args.bitrate, '-map_metadata', '-1',
                '-write_xing', '0', '-id3v2_version', '0', str(target)], check=True)
            result = decode(target)
            assert len(result) / 24000 >= .25 and np.count_nonzero(np.abs(result) > .01) / 24000 >= .08, key
            row = dict(id=key, word=word['word'], text=text, voice=VOICE, rate='+0%', bitrate=args.bitrate,
                source=raw.relative_to(ROOT).as_posix(), target=word['audioFile'],
                duration=round(len(result) / 24000, 3), audible=round(np.count_nonzero(np.abs(result) > .01) / 24000, 3),
                trimStart=round(start, 6), trimEnd=round(end, 6), onsetMargin=.06, endMargin=.08, tailPadding=.04,
                sourceSha256=hashlib.sha256(raw.read_bytes()).hexdigest(),
                sha256=hashlib.sha256(target.read_bytes()).hexdigest(), bytes=target.stat().st_size)
            target.with_suffix('.json').write_text(json.dumps(row, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f'Ready {key}: {row["duration"]:.3f}s, {row["bytes"]} bytes', flush=True)

    await asyncio.gather(*(clip(word) for word in words))
    print(f'Staged {len(words)} new English recordings with {VOICE}.', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
