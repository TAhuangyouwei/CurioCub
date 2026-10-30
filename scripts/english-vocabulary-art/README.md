# CurioCub：150 个生活词与图片

词库按 15 个主题分组，每组 10 个不重复生活词，供中国大陆普通小学入门阶段看图、听说使用。这是产品内容规划，不是全国统一的一年级考核词表，也不要求一次学完或全部拼写。

- 中英词表：[150-words.md](150-words.md)
- 词库源文件：`data/english-vocabulary.js`
- 小程序展示图：`packages/english-vocabulary/images/`，每词一张 128px 透明 WebP。
- 原始生成图：本目录的 `originals/`，保留完整 PNG。
- 逐图提示词与来源：本目录的 `records/`；汇总文件为 `manifest.json`。
- 按主题排好的图片检查页：本目录的 `previews/`。

图片使用内置 `image_gen` 工具逐张生成，再缩小用于小程序；原有课程音频保持原样。原图、提示词、检查页均处于已排除上传的 `scripts/` 内。

重新编译小程序后，进入“英语果园 → 150 个生活词”浏览图片词卡，切换主题或逐张翻看。150 个词均有离线录音；原有 12 段录音保持原样，新增 138 段沿用晓晓音色。词卡不会自动改写学习掌握状态或发放星星。“听音找图”覆盖全部词库，每轮最多 5 题；选错即加入跨次保存的“再练这些词”，之后某轮第一次选对才移出。旧 12 词的练习记录保留。

展示图从完整 PNG 重新编码为质量 45 的 128px WebP，透明通道保持一致；原图仍保存在 `originals/`，替换前展示图保存在 `scripts/english-audio/image-backup/`。录音原文件、生成文本与检查记录在 `scripts/english-audio/`。

动物贴纸册的 128 项图标、名称配置齐全，覆盖当前课程的贴纸奖励；现有图案是系统表情符号，不存在指向缺失图片文件的配置。部分动物有不同称号，因此会重复使用同一个动物图标。本次保留原奖励顺序和图标样式。

验证方式：

- `node scripts/check_english_vocabulary.js`
- `node scripts/check_english_listening.js`
- `node scripts/check_english_review.js`
- `python scripts/check_english_audio.py`
- `node scripts/check_content.js`
- `node scripts/check_package_size.js`
- 用 `make_contact_sheets.py` 生成逐主题检查页，检查图义、边缘和数字数量。
- 用 `finalize_art.py` 检查图片格式、尺寸、透明度和原图完整性，并汇总制作记录；图像脚本需要 Pillow。

图片制作和自动检查不能替代 iPhone/iPad 微信真机体验；仍需检查图片加载、按钮操作及原有录音播放。
