# 英语词库离线录音

新增 138 个词的录音与原有 12 段共同覆盖全部 150 词。原 12 段录音保留在原路径，不改字节。新增录音使用项目统一的晓晓音色 `zh-CN-XiaoxiaoNeural`，语速 `+0%`。

- `raw/`：生成服务返回的完整 MP3。
- `clips/`：经核验的 24kHz、单声道、24kbps MP3 及逐词生成记录。
- `manifest.json`：150 个最终使用录音的路径、时长、非静音时长、来源及校验值。
- `legacy-hashes.json`：原 12 段录音的校验值。
- `image-backup/`：为容纳新录音而优化前的 150 张展示图；完整 PNG 原图在 `scripts/english-vocabulary-art/originals/`。

生成脚本为 `scripts/generate_english_audio.py`，用较低的声音阈值确定完整语音区间，保留 60ms 起音余量、80ms 词尾余量及额外 40ms 缓冲，保留词内停顿。输出标准 CBR MP3，省去非必要的 Xing/ID3 标签以减少短录音文件的额外体积。动作词 read 用同音词 reed 锁定现在时长元音 /ri:d/，记录中保留实际生成文本。

生成依赖安装在已排除打包的 `scripts/english-audio-runtime/`，其中使用 edge-tts 7.3.1 和 imageio-ffmpeg 0.7.0。音频核验脚本还需要 PyAV 和 NumPy。小程序运行时只播放本地 MP3，无需上述生成依赖或在线语音服务。

检查命令：

```
node scripts/check_english_review.js
node scripts/check_english_listening.js
node scripts/check_english_vocabulary.js
python scripts/check_english_audio.py
node scripts/check_package_size.js
```

自动检查覆盖 150 个录音可解码、有声音、新录音的音色与来源校验、原录音不变，以及跨次复习的保存与移除。实际发音和微信端播放体验仍需真机试听。
