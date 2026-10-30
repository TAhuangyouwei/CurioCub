"""Keep generated originals and prepare small, transparent vocabulary assets."""
import argparse
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('key')
    parser.add_argument('source')
    args = parser.parse_args()
    assert args.key.replace('-', '').isalpha(), 'Expected a vocabulary key'
    source = Path(args.source)
    original = ROOT / 'scripts/english-vocabulary-art/originals' / f'{args.key}.png'
    original.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, original)
    destination = ROOT / 'packages/english-vocabulary/images' / f'{args.key}.webp'
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert('RGBA')
        assert image.getextrema()[3][0] < 255, 'Generated asset must have transparency'
        image.thumbnail((128, 128), Image.Resampling.LANCZOS)
        image.save(destination, 'WEBP', quality=55, method=6)
    print(f'{args.key}: {destination.stat().st_size} bytes')


if __name__ == '__main__':
    main()
