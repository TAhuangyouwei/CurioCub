# 十月第 3、4 周学校字表

照片共 56 字，按从左到右、从上到下读取：

竹叶草分气豆勺刀面半点大
高方圆亭花石林森去来弯多
入少出开外关里坐飞看走吃
立吐喝问笑哭直财砖领站门
力田包又欠跑男欢

“去、力、田”已在前 78 字，保留原位置；其余 53 字插在许、数之间。
已有 458 张字卡的 ID、配词、拼音、音频与图片路径不变；新增 17 字使用
hanzi-459～hanzi-475，资源随 hanzi-reading-7。显示顺序独立于资源编号。

新插画使用 imagegen 内置工具生成，透明原图保存在本目录
school-hanzi-atlas.png；切图保存在 packages/hanzi-reading-7/images/hanzi/school-*.png。
裁切和 64 色透明 PNG 输出由 prepare_school_hanzi.py 重现。

生成提示词（原文）：

Use case: illustration-story. Create ONE educational sprite atlas of 17 small children's picture-book illustrations for a Chinese kindergarten character-learning app. Transparent background; no text, no characters, no labels, no numerals, no borders. A precisely regular 5 columns by 4 rows grid (20 equal square cells) on a square canvas. Each independent illustration is centered within its cell, does not cross into neighboring cells, with at least 15% empty padding. Rows left to right exact subjects: row 1: (1) two hands separating two apples into two groups, (2) a cluster of colorful balloons, (3) one clearly recognizable spoon, (4) a blue square wooden block front view, (5) a small Chinese garden pavilion with tiled roof and open sides. Row 2: (6) two leafy trees side by side, (7) a small dense forest of many trees, (8) child standing outside a little house, (9) a child standing straight at attention, (10) a fish blowing round bubbles. Row 3: (11) a child holding a cup and drinking water, (12) a child crying with visible tears (gentle and child-friendly), (13) one straight ruler with straight line beside it, (14) a small treasure chest filled with gems and coins, (15) a sleepy child yawning with hand near mouth. Row 4: (16) one cheerful little boy, (17) two children laughing and celebrating with raised hands, (18,19,20) leave last three cells completely empty and transparent. Warm friendly softly painted children's-book style, clean rounded forms and bold readable silhouettes for 128px icons, consistent palette of sky blue, peach, mint, warm yellow, white highlights. Every illustration must be isolated from the others and recognizably depict the described word.

新字声音沿用 XiaoxiaoNeural，-5% 语速，24kHz 单声道 16kbps MP3，保留末尾停顿。
分/吐/喝使用纷/土/呵锁定 fēn/tǔ/hē；字卡拼音以配词读音为准。
笔顺来源保持 hanzi-writer-data 2.0.1 / Arphic PL，并保留原授权。

手机排序入口：识字星球 → 家长设置 → 调整识字顺序。按点选顺序选择字，指定
放在哪个字前面，保存后用于地图、字卡、范围、临摹、配对和未来新生成的每日任务。
已经生成的今日任务保持不变；学习范围保留端点，按调整后的顺序解释连续范围。
顺序与进度只保存在当前设备。

复测：重新编译并生成手机预览，在“电”点听字和提示里的听字；写几笔后打开提示，
检查弹窗中没有笔迹，再点继续写检查笔迹恢复。仍需 iPhone/Android 微信真机确认。
