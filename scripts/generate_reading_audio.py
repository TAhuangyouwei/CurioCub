"""Generate offline recordings for original short sentences; reuse character audio."""
import asyncio
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

import edge_tts
from import_public_pinyin_audio import convert

ROOT = Path(__file__).resolve().parent.parent


async def main(ffmpeg):
    data = json.loads(subprocess.check_output(['node', '-e',
        "process.stdout.write(JSON.stringify({units:require('./data/learning').getModule('hanzi').items,sentences:require('./packages/hanzi-practice/data/reading').sentences}))"], cwd=ROOT).decode('utf-8'))
    output = ROOT / 'packages/hanzi-practice/audio'
    output.mkdir(exist_ok=True)
    for unit in data['units']:
        target = output / (unit['id'] + '.mp3')
        if target.exists() and target.stat().st_size:
            continue  # Preserve audited compact clips and full-source exceptions.
        source = unit['characterAudioFile']
        source = ROOT / (source.lstrip('/') if source.startswith('/') else 'assets/audio/' + source)
        # Re-encode only this package's duplicate clips; original lesson audio stays intact.
        subprocess.run([str(ffmpeg), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source),
                        '-ar', '24000', '-ac', '1', '-b:a', '16k', '-map_metadata', '-1',
                        str(output / (unit['id'] + '.mp3'))], check=True)
    semaphore = asyncio.Semaphore(3)

    async def clip(sentence):
        target = ROOT / sentence['audio'].lstrip('/')
        if target.exists() and target.stat().st_size:
            return
        async with semaphore:
            for attempt in range(3):
                try:
                    with tempfile.TemporaryDirectory(prefix='curiocub-reading-') as directory:
                        source = Path(directory) / 'source.mp3'
                        await edge_tts.Communicate(sentence['text'], voice='zh-CN-XiaoxiaoNeural', rate='-12%', receive_timeout=30).save(str(source))
                        convert(ffmpeg, source, target)
                    print('Ready', sentence['id'], flush=True)
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(attempt + 1)
    await asyncio.gather(*(clip(sentence) for sentence in data['sentences']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', type=Path, required=True)
    asyncio.run(main(parser.parse_args().ffmpeg))
