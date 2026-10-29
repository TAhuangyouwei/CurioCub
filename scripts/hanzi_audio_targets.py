"""Single-syllable sources for characters requiring explicit pronunciation."""
import unicodedata

def syllable_key(pinyin):
    decomposed = unicodedata.normalize('NFD', pinyin)
    tones = {'\u0304': '1', '\u0301': '2', '\u030c': '3', '\u0300': '4'}
    tone = next((value for mark, value in tones.items() if mark in decomposed), '5')
    syllable = ''.join(char for char in decomposed if char not in tones).replace('u\u0308', 'v')
    if syllable.startswith('lv'):
        syllable = 'luu' + syllable[2:]
    if syllable.startswith('nv'):
        syllable = 'nuu' + syllable[2:]
    return syllable + tone
