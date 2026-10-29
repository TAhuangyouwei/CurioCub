"""Stage and verify one voice for all hanzi, then publish matching lesson/practice clips."""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

from generate_hanzi_voice import ROOT, VOICE, RATE, read_units, asset_path, generate_clip
from check_hanzi_audio_assets import measure


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', type=Path, required=True)
    parser.add_argument('--stage', type=Path, required=True)
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    units = read_units()
    semaphore = asyncio.Semaphore(3)
    done = 0

    async def clip(unit):
        nonlocal done
        target = args.stage / asset_path(unit, 'characterAudioFile')
        metadata = target.with_suffix('.json')
        async with semaphore:
            cached = json.loads(metadata.read_text(encoding='utf-8')) if metadata.exists() else {}
            needs_alignment = cached.get('contextExtracted') and cached.get('alignmentMethod') != 'acoustic-v1'
            needs_le_first_tone = unit['title'] == '了' and cached.get('text') != 'lē'
            needs_original_rate = unit['title'] in ('长', '了') and cached.get('rate') != '+0%'
            if not target.exists() or not metadata.exists() or needs_alignment or needs_le_first_tone or needs_original_rate:
                await generate_clip(unit, 'characterAudioFile', args.stage, args.ffmpeg, '24k')
            duration, audible = measure(target)
            assert duration >= 0.18 and audible >= 0.06, f'{unit["title"]}: missing or truncated voice'
            info = json.loads(metadata.read_text(encoding='utf-8'))
            expected_rate = '+0%' if unit['title'] in ('长', '了') else RATE
            assert info['voice'] == VOICE and info['rate'] == expected_rate and info['singleCharacter']
            assert info['contextExtracted'] or len(info['text']) == 1 or (unit['title'] == '了' and info['text'] == 'lē')
            if info['contextExtracted']: assert info['alignmentMethod'] == 'acoustic-v1'
            done += 1
            if done % 25 == 0 or done == len(units): print(f'Validated {done}/{len(units)}', flush=True)
            return unit, target, info

    results = await asyncio.gather(*(clip(unit) for unit in units))
    if not args.publish:
        return
    rejected = [unit['title'] for unit, _, info in results if info.get('listeningReview') == 'rejected']
    assert not rejected, f'用户试听未通过，不能替换正式素材：{"、".join(rejected)}'
    # Publish only after the full staged set has passed. Preserve the previous recordings.
    backup = ROOT / 'scripts/audio-audit/before-same-voice'
    manifest = []
    for unit, source, info in results:
        paths = [asset_path(unit, 'characterAudioFile'), Path('packages/hanzi-practice/audio') / (unit['id'] + '.mp3')]
        for relative in paths:
            target = ROOT / relative
            saved = backup / relative
            saved.parent.mkdir(parents=True, exist_ok=True)
            if not saved.exists(): shutil.copyfile(target, saved)
            if relative == paths[0]:
                shutil.copyfile(source, target)
            else:
                subprocess.run([str(args.ffmpeg), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source),
                                '-ar', '24000', '-ac', '1', '-b:a', '16k', '-map_metadata', '-1', str(target)], check=True)
        info['files'] = [{'path': file.as_posix(), 'sha256': hashlib.sha256((ROOT / file).read_bytes()).hexdigest()} for file in paths]
        manifest.append(info)
        if len(manifest) % 50 == 0: print(f'Published {len(manifest)}/{len(results)}', flush=True)
    output = ROOT / 'scripts/audio-sources/same-voice-manifest.json'
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Published {len(results)} characters / {len(results) * 2} clips, voice={VOICE}, rate={RATE}', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
