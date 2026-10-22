# 十月新增识字音频

- 单字：复用项目此前已引入的 davinfifield/mp3-chinese-pinyin-sound 真人普通话读音，复制到本分包，避免依赖其他分包下载状态。
- 对应读音由 data/hanzi-extra.js 每行第五项指定，例如 泪 lei4、雷 lei2，耳 er3、二 er4。
- 词语：用与现有识字词语相同的 zh-CN-XiaoxiaoNeural 生成，语速 -5%，去掉首尾多余静音，保存为 24kHz 单声道 MP3。
- 所有声音已保存为静态音频。孩子在小程序内播放时不调用语音合成服务。
- 可使用 scripts/generate_hanzi_extra_audio.py 重建新增音频，已有词语文件会跳过，不改动原有 40 字音频。
