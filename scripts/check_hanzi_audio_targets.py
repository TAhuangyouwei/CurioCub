"""Guard isolated pronunciation sources before any network synthesis is used."""
import asyncio
from pathlib import Path
import tempfile
import sys
import types
from unittest.mock import patch

import generate_hanzi_voice as voice
from hanzi_audio_targets import syllable_key


async def main():
    assert syllable_key('le') == 'le5'
    assert syllable_key('cháng') == 'chang2'
    assert syllable_key('jǐ') == 'ji3'
    assert syllable_key('lǜ') == 'luu4'
    assert all(len(text) == 1 or (char == '了' and text == 'lē') for char, text in voice.CHARACTER_TEXT.items())
    assert '了' not in voice.CHARACTER_CONTEXT
    units = voice.read_units()
    calls = []
    class Communicate:
        def __init__(self, text, **options):
            calls.append((text, options))
        async def save(self, filename):
            Path(filename).write_bytes(b'voice')
        async def stream(self):
            yield {'type': 'audio', 'data': b'voice'}
            yield {'type': 'WordBoundary', 'text': '前文', 'offset': 0, 'duration': 2000000}
            yield {'type': 'WordBoundary', 'text': current['title'], 'offset': 2000000, 'duration': 3000000}
    fake_tts = types.SimpleNamespace(Communicate=Communicate)
    with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules, {'edge_tts': fake_tts}):
        for unit in units:
            current = unit
            (Path(directory) / voice.asset_path(unit, 'characterAudioFile')).parent.mkdir(parents=True, exist_ok=True)
            with patch.object(voice, 'convert') as convert, patch.object(voice.subprocess, 'run') as run, \
                    patch.object(voice, 'single_span', return_value=(0.72, 0.26)) as acoustic, patch('builtins.print'):
                await voice.generate_clip(unit, 'characterAudioFile', Path(directory), Path('ffmpeg'))
                assert convert.call_count == 1
                assert calls[-1][1]['voice'] == voice.VOICE
                assert calls[-1][1]['rate'] == ('+0%' if unit['title'] in ('长', '了') else voice.RATE)
                assert unit['title'] in voice.CHARACTER_CONTEXT or len(calls[-1][0]) == 1 or (unit['title'] == '了' and calls[-1][0] == 'lē')
                if unit['title'] in voice.CHARACTER_CONTEXT:
                    acoustic.assert_called_once()
                    command = run.call_args.args[0]
                    assert command[command.index('-ss') + 1] == '0.72'
                    assert command[command.index('-t') + 1] == '0.26'
                    # Service timestamps in this fixture start at 0.2; never crop with them.
                else:
                    acoustic.assert_not_called()
        import generate_audio as original
        calls.clear()
        with patch.object(original, 'OUTPUT', Path(directory) / 'original'), patch('builtins.print'):
            await original.main()
        for index, (character, _) in enumerate(original.HANZI):
            text, options = calls[index * 2]
            assert len(character) == 1 and (len(text) == 1 or (character == '了' and text == 'lē')), '原始单字生成不能混入词语或解释'
            assert options['voice'] == 'zh-CN-XiaoxiaoNeural'
            assert options['rate'] == '+0%'
        assert calls[18 * 2][0] == '常', '长的直接合成需固定为 cháng'
        assert calls[23 * 2][0] == 'lē', '了按用户指定的一声直接合成，不混入天黑了'
        assert all(options['voice'] == 'zh-CN-XiaoxiaoNeural' for _, options in calls), '包括英文在内的应用配音全部使用晓晓'
    assert voice.character_span([{'text': '了', 'offset': 2000000, 'duration': 3000000}], '了') == (0.2, 0.3)
    for boundaries in [[], [{'text': '天黑了', 'offset': 0, 'duration': 6000000}]]:
        try:
            voice.character_span(boundaries, '了')
        except ValueError:
            pass
        else:
            raise AssertionError('不能把整句话当作单字边界')
    print('Generation guard passed: all 475 characters use one voice; context crops use acoustic timing, not service timestamps.')


if __name__ == '__main__':
    asyncio.run(main())
