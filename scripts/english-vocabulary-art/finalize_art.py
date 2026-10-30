"""Verify all selected images and collect their generation records for handoff."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'scripts/english-vocabulary-art'
data = json.loads((ART / 'words.json').read_text(encoding='utf-8'))
assert len(data['words']) == len({word['id'] for word in data['words']}) == 150
items = []
for word in data['words']:
    packed = ROOT / word['image'].lstrip('/')
    original = ART / 'originals' / f"{word['id']}.png"
    record = json.loads((ART / 'records' / f"{word['id']}.json").read_text(encoding='utf-8'))
    assert record['id'] == word['id'] and record['prompt'] and record['generator'] == 'built-in image_gen'
    for file, expected_format in [(packed, 'WEBP'), (original, 'PNG')]:
        with Image.open(file) as image:
            image.load()
            assert image.format == expected_format, f'Unexpected format: {file}'
            assert image.convert('RGBA').getchannel('A').getbbox(), f'Empty image: {file}'
            assert image.convert('RGBA').getextrema()[3][0] < 255, f'Transparency lost: {file}'
            if file == packed:
                assert max(image.size) == 128 and min(image.size) > 0, f'Unexpected size: {file}'
    items.append({**word, **record, 'original': str(original.relative_to(ROOT)).replace('\\', '/'),
                  'bytes': packed.stat().st_size})
assert len(list((ROOT / 'packages/english-vocabulary/images').glob('*.webp'))) == 150
manifest = {'createdDate': '2026-10-30', 'generator': 'built-in image_gen', 'wordCount': len(items),
            'themeCount': len(data['groups']), 'packagedImageBytes': sum(item['bytes'] for item in items),
            'groups': data['groups'], 'items': items}
(ART / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"Verified {len(items)} transparent vocabulary images and PNG originals; {manifest['packagedImageBytes']} packaged image bytes.")
