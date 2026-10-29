"""Generate an explicit Xiaoxiao a3 pronunciation probe without changing app assets."""
import os
from pathlib import Path
import re
import urllib.error
import urllib.request

from check_hanzi_audio_assets import measure

ROOT = Path(__file__).resolve().parents[1]


def main():
    key = os.environ.get('SPEECH_KEY', '')
    region = os.environ.get('SPEECH_REGION', '')
    if not key or not re.fullmatch(r'[a-z][a-z0-9]+', region):
        raise SystemExit('请先在本地配置 SPEECH_KEY 和 SPEECH_REGION；不要把密钥发到聊天或写进项目。')
    directory = ROOT / 'scripts/audio-audit/ssml-direct-probe'
    directory.mkdir(exist_ok=True)
    for source in ['pinyin-a3-direct.ssml']:
        payload = (ROOT / 'scripts/audio-sources' / source).read_bytes()
        request = urllib.request.Request(
            f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1',
            data=payload, method='POST', headers={
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                'User-Agent': 'CurioCub-Pronunciation-Probe',
            })
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                audio = response.read()
        except urllib.error.HTTPError as error:
            raise SystemExit(f'语音服务请求失败：HTTP {error.code}；尚未替换正式录音。') from None
        target = directory / source.replace('.ssml', '.mp3')
        target.write_bytes(audio)
        duration, audible = measure(target)
        if duration < .18 or audible < .06:
            raise SystemExit(f'{target.name} 没有通过声音完整性检查，不能采用。')
        print(f'试听已生成：{target}；尚未替换正式录音。')


if __name__ == '__main__':
    main()
