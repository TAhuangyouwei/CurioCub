"""Reduce bundled PNG palettes without changing image size or audio resources."""
import argparse
from io import BytesIO
from pathlib import Path
import shutil

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent


def matte(image):
    return Image.alpha_composite(Image.new('RGBA', image.size, 'white'), image).convert('RGB')


def main(apply=False):
    saved = changed = 0
    for folder in [ROOT / 'assets/images', ROOT / 'packages']:
        for source in sorted(folder.rglob('*.png')):
            with Image.open(source) as image:
                if image.mode == 'P':
                    continue  # Avoid repeatedly quantizing an already compressed image.
                original = image.convert('RGBA')
                compact = original.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
                output = BytesIO()
                compact.save(output, format='PNG', optimize=True)
                payload = output.getvalue()
                if len(payload) >= source.stat().st_size:
                    continue
                restored = compact.convert('RGBA')
                error = sum(ImageStat.Stat(ImageChops.difference(matte(original), matte(restored))).mean) / 3
                assert error < 4, f'Visible color change: {source} ({error:.2f}/255)'
                assert restored.size == original.size
                if original.getextrema()[3][0] == 0:
                    assert restored.getextrema()[3][0] == 0, f'Transparency lost: {source}'
                saved += source.stat().st_size - len(payload)
                changed += 1
            if apply:
                backup = ROOT / 'scripts/packaging-originals' / source.relative_to(ROOT)
                if not backup.exists():
                    backup.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, backup)
                source.write_bytes(payload)
    print(f'{"Optimized" if apply else "Would optimize"} {changed} PNGs; saved {saved} bytes. Audio unchanged.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    main(parser.parse_args().apply)
