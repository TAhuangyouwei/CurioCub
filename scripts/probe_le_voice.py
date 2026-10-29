"""Keep full contexts and isolated candidates for listening, without changing app assets."""
import asyncio
import json
from pathlib import Path
import subprocess

import edge_tts

from align_hanzi_context import single_span, waveform


async def main():
    import sys
    ffmpeg = sys.argv[1]
    directory = Path(__file__).parent / 'audio-audit/le-natural-probe'
    directory.mkdir(exist_ok=True)
    for name, text, rate in [('hao', '好了。', '-20%'), ('xuehui', '学会了。', '-20%'), ('zhidao', '知道了。', '-20%')]:
        source = directory / f'{name}-context.mp3'
        if not source.exists():
            await edge_tts.Communicate(text, voice='zh-CN-XiaoxiaoNeural', rate=rate).save(str(source))
        start, duration = single_span(source, text, '了')
        # Retain the consonant onset; increase speech duration without changing pitch.
        samples = waveform(source)[int(start * 16000):int((start + duration) * 16000)]
        import numpy as np
        active = np.flatnonzero(np.abs(samples) > .01)
        speech = (active[-1] - active[0]) / 16000
        tempo = min(1, max(.65, speech / .36))
        target = directory / f'{name}-le-v5.mp3'
        subprocess.run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source), '-af',
                        f'atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,'
                        f'rubberband=tempo={tempo}:pitch=1,volume=1.4,apad=pad_dur=0.12',
                        '-ar', '24000', '-ac', '1', '-b:a', '24k', str(target)], check=True)
        info = dict(text=text, rate=rate, start=start, duration=duration, speech=speech, tempo=tempo)
        target.with_suffix('.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
        print(name, info, flush=True)


if __name__ == '__main__':
    asyncio.run(main())
