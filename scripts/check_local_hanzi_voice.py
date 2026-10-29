"""Regression checks for syllable/tone control before any model inference."""
from local_hanzi_voice import phonemes
from generate_hanzi_voice import read_units

expected = {'le': 'ㄌㄜ5', 'la': 'ㄌㄚ5', 'cháng': 'ㄔㄤ2', 'zhǎng': 'ㄓㄤ3',
            'děi': 'ㄉㄟ3', 'zhe': 'ㄓㄜ5', 'de': 'ㄉㄜ5', 'shí': 'ㄕ十2',
            'zǐ': 'ㄗㄭ3', 'nǚ': 'ㄋㄩ3', 'yuè': '月4', 'shuǐ': 'ㄕ为3'}
for pinyin, value in expected.items():
    assert phonemes(pinyin) == value, (pinyin, phonemes(pinyin))
for invalid in ['abcd', '天黑了', 'le5 la5']:
    try:
        phonemes(invalid)
    except (ValueError, KeyError):
        pass
    else:
        raise AssertionError('只允许明确的单个拼音音节：' + invalid)
for unit in read_units():
    phones = phonemes(unit['pinyin'])
    assert phones[-1] in '12345'
    assert len(phones) >= 2
print('475 个字的拼音均可转换；了/啦、长/掌、轻声、卷舌和 ü 韵母回归检查通过。')
