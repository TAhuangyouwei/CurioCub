# 十月新增识字音频

- 单字：使用 davinfifield/mp3-chinese-pinyin-sound 的原始真人普通话录音，重新编码到本分包，避免从已裁剪的拼音文件复制残缺读音，也避免依赖其他分包下载状态。
- 对应读音由 data/hanzi-extra.js 每行第五项指定，例如 泪 lei4、雷 lei2，耳 er3、二 er4。
- 词语：用与现有识字词语相同的 zh-CN-XiaoxiaoNeural 生成，语速 -5%，保存为 24kHz 单声道、32kbps MP3。
- 单字和词语都保留完整原录音，在结尾补 120ms 静音。不按停顿裁剪，防止轻声字头、字间停顿被误认为结尾，造成无声或只读半句。
- 所有声音已保存为静态音频。孩子在小程序内播放时不调用语音合成服务。
- 可使用 `python scripts/generate_hanzi_extra_audio.py --pinyin-source <原始mp3目录> --ffmpeg <ffmpeg路径> --force` 重建全部新增音频。省略 `--force` 时跳过已有词语文件，不改动原有 40 字音频。
- 使用 `python scripts/check_hanzi_audio.py --ffmpeg <ffmpeg路径>` 检查全部 78 字的 156 段录音是否可解码、有声音且满足最低时长，并验证音频处理不会在字间停顿或轻声字头处截断。这些自动检查不能代替真机试听。
