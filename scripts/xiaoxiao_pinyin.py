"""Explicit tone-marked pinyin for the existing Xiaoxiao voice."""
import re
from pathlib import Path

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '+0%'
PITCH = '+0Hz'
ROOT = Path(__file__).resolve().parents[1]
APPROVED_SOURCES = {
    'a1': ROOT / 'scripts/audio-sources/pinyin-a1-xiaoxiao.mp3',
    'a3': ROOT / 'scripts/audio-sources/pinyin-a3-xiaoxiao.mp3',
    'le1': ROOT / 'scripts/audio-sources/le1-xiaoxiao-direct.mp3',
    'chang2': ROOT / 'scripts/audio-sources/chang-xiaoxiao-direct.mp3',
}
LISTENING_APPROVED_KEYS = frozenset(['a1', 'a2', 'a4', 'ma1', 'ma2', 'ma3', 'ma4',
                                   'bo1', 'de1', 'le1', 'nv3', 'lv4', 'chang2'])
for key in LISTENING_APPROVED_KEYS - APPROVED_SOURCES.keys():
    APPROVED_SOURCES[key] = ROOT / 'scripts/audio-sources' / f'pinyin-{key}-xiaoxiao.mp3'
FINAL_SYLLABLES = {'a': 'a', 'o': 'o', 'e': 'e', 'i': 'yi', 'u': 'wu', 'v': 'yu',
                   'ai': 'ai', 'ei': 'ei', 'ui': 'wei', 'ao': 'ao', 'ou': 'ou', 'iu': 'you',
                   'ie': 'ye', 've': 'yue', 'er': 'er', 'an': 'an', 'en': 'en', 'in': 'yin',
                   'un': 'wen', 'vn': 'yun', 'ang': 'ang', 'eng': 'eng', 'ing': 'ying', 'ong': 'ong'}


def basic_key(kind, value, tone=1):
    from import_public_pinyin_audio import INITIAL_SOURCES
    value = value.replace('ü', 'v')
    if kind == 'initial': return INITIAL_SOURCES[value]
    if kind != 'final' or tone not in (1, 2, 3, 4): raise ValueError((kind, value, tone))
    return FINAL_SYLLABLES[value] + str(tone)


def spoken_pinyin(key):
    match = re.fullmatch(r'([a-zv]+)([1-5])', key)
    if not match:
        raise ValueError(f'Invalid pinyin key: {key}')
    syllable, tone = match.groups()
    syllable = syllable.replace('v', 'ü')
    if tone == '5':
        return syllable
    marks = {'a': 'āáǎà', 'o': 'ōóǒò', 'e': 'ēéěè', 'i': 'īíǐì', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}
    # a/e take priority; ou marks o, other compounds mark their last vowel.
    if 'a' in syllable: index = syllable.index('a')
    elif 'e' in syllable: index = syllable.index('e')
    elif 'ou' in syllable: index = syllable.index('o')
    else:
        vowels = [i for i, char in enumerate(syllable) if char in 'iouü']
        if not vowels:
            # Syllabic m/n/ng need combining marks rather than ordinary vowel indexing.
            return syllable[0] + ['\u0304', '\u0301', '\u030c', '\u0300'][int(tone) - 1] + syllable[1:]
        index = vowels[-1]
    return syllable[:index] + marks[syllable[index]][int(tone) - 1] + syllable[index + 1:]
