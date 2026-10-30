"""Render themed image sheets for human review; originals and app images are unchanged."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'scripts/english-vocabulary-art/words.json').read_text(encoding='utf-8'))
OUT = ROOT / 'scripts/english-vocabulary-art/previews'
OUT.mkdir(parents=True, exist_ok=True)
FONT = 'C:/Windows/Fonts/msyh.ttc'
title_font = ImageFont.truetype(FONT, 26)
word_font = ImageFont.truetype(FONT, 19)
meaning_font = ImageFont.truetype(FONT, 15)
missing = []
for index, group in enumerate(DATA['groups']):
    words = [word for word in DATA['words'] if word['topic'] == group['id']]
    sheet = Image.new('RGB', (1100, 530), '#edf5fb')
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 18), f"{index + 1:02d}  {group['title']}", font=title_font, fill='#27445d')
    for i, word in enumerate(words):
        x, y = 10 + (i % 5) * 220, 70 + (i // 5) * 225
        draw.rounded_rectangle((x, y, x + 210, y + 215), radius=15, fill='white')
        file = ROOT / word['image'].lstrip('/')
        if file.exists():
            with Image.open(file) as image:
                image = image.convert('RGBA')
                image.thumbnail((144, 144))
                sheet.paste(image, (x + (210 - image.width) // 2, y + 8), image)
        else:
            missing.append(word['id'])
            draw.text((x + 15, y + 65), 'Not generated yet', font=meaning_font, fill='#a4a4a4')
        draw.text((x + 105, y + 156), word['word'], anchor='mt', font=word_font, fill='#27445d')
        draw.text((x + 105, y + 184), word['meaning'], anchor='mt', font=meaning_font, fill='#526c84')
    sheet.save(OUT / f"{index + 1:02d}-{group['id']}.jpg", quality=90)
print(f"Review sheets: {OUT}; {150 - len(missing)}/150 images ready")
if missing:
    print('Missing: ' + ', '.join(missing))
