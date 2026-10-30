"""Compare small display encodings against the original generated artwork."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[2]
ORIGINALS = ROOT / 'scripts/english-vocabulary-art/originals'
current = sum(file.stat().st_size for file in (ROOT / 'packages/english-vocabulary/images').glob('*.webp'))
for quality in [45, 40]:
    output = ROOT / f'scripts/english-audio/images-q{quality}'
    output.mkdir(parents=True, exist_ok=True)
    errors = []
    for original in ORIGINALS.glob('*.png'):
        with Image.open(original) as image:
            image = image.convert('RGBA')
            image.thumbnail((128, 128), Image.Resampling.LANCZOS)
            target = output / f'{original.stem}.webp'
            image.save(target, 'WEBP', quality=quality, method=6)
            white = Image.new('RGBA', image.size, 'white')
            with Image.open(target) as compact:
                compact = compact.convert('RGBA')
                assert compact.getchannel('A').tobytes() == image.getchannel('A').tobytes(), original
                error = ImageStat.Stat(ImageChops.difference(Image.alpha_composite(white, image).convert('RGB'),
                    Image.alpha_composite(white, compact).convert('RGB'))).mean
                errors.append(sum(error) / 3)
    size = sum(file.stat().st_size for file in output.glob('*.webp'))
    print(f'q{quality}: {size} bytes, saved {current - size}, maximum mean color error {max(errors):.2f}/255')
    sheet = Image.new('RGB', (900, 400), '#edf5fb')
    for i, key in enumerate(['dog', 'friend', 'read', 'nine', 'white']):
        for row, source in enumerate([ROOT / 'packages/english-vocabulary/images' / f'{key}.webp', output / f'{key}.webp']):
            with Image.open(source) as picture:
                picture = picture.convert('RGBA')
                sheet.paste(picture, (i * 180 + 26, row * 200 + 35), picture)
    sheet.save(ROOT / f'scripts/english-audio/compare-q{quality}.png')
