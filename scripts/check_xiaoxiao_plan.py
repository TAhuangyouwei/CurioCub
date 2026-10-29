"""Guard voice migration coverage, tone spelling, and approved recordings."""
from pathlib import Path
from xiaoxiao_pinyin import VOICE, APPROVED_SOURCES, LISTENING_APPROVED_KEYS, spoken_pinyin, basic_key
from unify_xiaoxiao_audio import plan, publish

for key, expected in {'ma1': 'mā', 'ma2': 'má', 'ma3': 'mǎ', 'ma4': 'mà', 'nv3': 'nǚ',
                      'lv4': 'lǜ', 'lve4': 'lüè', 'liu2': 'liú', 'gui4': 'guì', 'ou3': 'ǒu', 'men5': 'men'}.items():
    assert spoken_pinyin(key) == expected
assert basic_key('initial', 'l') == 'le1'
assert basic_key('final', 'ui', 3) == 'wei3'
assert basic_key('final', 'ün', 2) == 'yun2'
assert 'a1' in APPROVED_SOURCES and 'a3' in APPROVED_SOURCES
rows = plan()
expected = {'english': 12, 'hanzi': 100, 'pinyin-basic': 131, 'pinyin-basic-copy': 47,
            'pinyin-card': 12, 'pinyin-syllable': 1382}
assert {category: sum(r['category'] == category for r in rows) for category in expected} == expected
assert all(row['voice'] == VOICE for row in rows)
for row in rows:
    if row['key'] in APPROVED_SOURCES:
        assert Path(row['source']) == APPROVED_SOURCES[row['key']]
assert len({row['path'] for row in rows}) == 1684
assert 'a3' not in LISTENING_APPROVED_KEYS
for key in ['a3', 'ou3']:
    try:
        publish([dict(category='pinyin-syllable', key=key, path=f'packages/pinyin-01/audio/{key}.mp3')])
    except AssertionError as error:
        assert '尚未通过试听' in str(error)
    else:
        raise AssertionError('未核准或已弃用的候选不能写进应用')
print('替换计划通过：1684 份目标完整且无重复；确认过的长/了保持原文件；特殊拼音有固定来源。')
