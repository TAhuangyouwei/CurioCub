# d 音频修复

- 来源：项目已使用的 davinfifield/mp3-chinese-pinyin-sound，原始 `mp3/de2.mp3`。
- 原因：旧的 `silenceremove` 处理将约 1.38 秒录音截成约 0.08 秒。导入脚本已改为只补尾部静音，但旧音频未重新生成。
- 本次从完整原录音恢复 `assets/audio/pinyin-basic/initial-d.mp3` 和 `packages/pinyin-03/audio/de2.mp3`；保留原读音和音量，不改变声调。
- 处理：PyAV / libmp3lame，24kHz、单声道，分别为 24kbps / 32kbps；保留全文，末尾补 120ms 静音。
- 验证：`python scripts/check_pinyin_audio.py`（需要 PyAV、numpy），检查有效声音和完整时长。既有 `scripts/import_public_pinyin_audio.py` 的非裁剪转换也可从原始音源重建。
- 来源及许可：https://github.com/davinfifield/mp3-chinese-pinyin-sound （Unlicense）。

后续教学读音修正：声母按键改用平直的一声呼读音。因此 `initial-d.mp3` 现从完整的 `de1.mp3` 重建；完整音节 `de2.mp3` 仍保留二声录音，用于 dé 音节。f、t、l、r、c 同步从各自一声源录音重建，不做变速或音高拉平处理。导入脚本的 23 个声母映射均使用一声源文件。
