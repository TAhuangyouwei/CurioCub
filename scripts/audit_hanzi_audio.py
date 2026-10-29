"""Locally transcribe hanzi recordings for review; no audio is sent to a service."""
import argparse
import json
import subprocess
import os
import sys
from pathlib import Path
import time
import numpy as np
from faster_whisper.audio import decode_audio

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]


def asset_path(filename, root=ROOT):
    return root / (filename.lstrip('/') if filename.startswith('/') else f'assets/audio/{filename}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', default='cuda')
    parser.add_argument('--ids', default='')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--batch-size', type=int, default=16)
    parser.add_argument('--stage', type=Path, default=ROOT, help='Audit staged files before replacing app audio')
    args = parser.parse_args()
    units = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify(require('./data/learning').getModule('hanzi').items))"], cwd=ROOT).decode('utf-8'))
    selected = set(args.ids.split(',')) if args.ids else None
    dll_paths = []
    if args.device == 'cuda' and os.name == 'nt':
        for directory in (Path(sys.prefix) / 'Lib/site-packages/nvidia').glob('*/bin'):
            os.environ['PATH'] = str(directory) + os.pathsep + os.environ['PATH']
            dll_paths.append(os.add_dll_directory(str(directory)))
    model = WhisperModel('mobiuslabsgmbh/faster-whisper-large-v3-turbo', device=args.device,
                         compute_type='int8_float16' if args.device == 'cuda' else 'int8',
                         cpu_threads=8, local_files_only=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    began = time.monotonic()
    if selected:
        units = [unit for unit in units if unit['id'] in selected]
    with args.output.open('w', encoding='utf-8') as output:
        for offset in range(0, len(units), args.batch_size):
            batch = units[offset:offset + args.batch_size]
            clips, spans, cursor = [], [], 0.0
            for unit in batch:
                samples = decode_audio(str(asset_path(unit['characterAudioFile'], args.stage)), sampling_rate=16000)
                duration = len(samples) / 16000
                spans.append((cursor, cursor + duration))
                clips.extend([samples, np.zeros(9600, dtype=np.float32)])
                cursor += duration + 0.6
            segments, info = model.transcribe(np.concatenate(clips), language='zh', beam_size=5,
                condition_on_previous_text=False, vad_filter=False, word_timestamps=True,
                initial_prompt='下面是依次朗读的单个汉字。')
            segments = list(segments)
            words = [word for segment in segments for word in (segment.words or [])]
            for index, (unit, (start, end)) in enumerate(zip(batch, spans)):
                assigned = [word for word in words if start <= (word.start + word.end) / 2 < end + 0.15]
                row = {key: unit[key] for key in ('id', 'title', 'pinyin', 'phrase', 'characterAudioFile')}
                row.update(duration=end - start, recognized=''.join(word.word for word in assigned),
                           words=[{'text': word.word, 'start': round(word.start - start, 3), 'end': round(word.end - start, 3)}
                                  for word in assigned])
                output.write(json.dumps(row, ensure_ascii=False) + '\n')
                print(f"{offset + index + 1}/{len(units)} {unit['title']}: {row['recognized']} ({end - start:.2f}s)", flush=True)
            output.flush()
    print(f'Finished in {time.monotonic() - began:.1f}s', flush=True)


if __name__ == '__main__':
    main()
