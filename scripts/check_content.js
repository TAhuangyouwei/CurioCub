const fs = require('fs')
const path = require('path')
const { modules } = require('../data/learning')

const expectedCounts = { hanzi: 475, pinyin: 63, math: 16, english: 12 }
const originalHanzi = '土五中上天禾人尺头下虫把口子水你山牙长比四西小了手我去东心必女力月儿巴几九与马鸟'
const expectedHanzi = "土五中上天禾人尺头下虫把口子水你山牙长比四西小了手我去东心必女力月儿巴几九与马鸟一泪眉耳三舌足身二牛羊六鱼七日云风八雨雪雷电田木米果十瓜苗明尖李姜言午弓张许数字歌爬翻筋斗拍皮球个指就是两只过车入地腾驾雾变成流星飞跳蜻蜓会蚱蜢弟高猫拉老鼠不坐黄狼鸡灰虎谁也海龟妈沙滩扒生蛋盖太阳晒孵出娃进大找做影兔来螃蟹墙灯关都跑开又门宝认红黑蓝铁铜锁先得清自家台偷油吃吱喊奶肯叽里咕噜滚多少边群雁瞧记牢牵花往到瓦顶吹喇叭嘀嗒愿跟耍落叶秋树像蝴蝶翅膀追豆荚真可爱面住满乖房呀排着队走农民袋草倒扶狗咬枯能当柴烧半有孩叫起床已经点鞋穿脸洗早饭课本带学路光脚板金银躲在梦胖南冬看亮初根线见蛾团圆拿剪刀甲袍要惹请他蘑菇傻没撑伞干啥"
const audioDir = path.join(__dirname, '..', 'assets', 'audio')
const imageDir = path.join(__dirname, '..', 'assets', 'images', 'hanzi')
const extraImageDir = path.join(__dirname, '..', 'packages', 'hanzi-extra', 'images', 'hanzi')
const learningSource = fs.readFileSync(path.join(__dirname, '..', 'data', 'learning.js'), 'utf8')
const unsupportedEmoji = ['🪿', '🐦‍⬛', '🫶', '🛝', '🧼', '🟠', '🦯', '🧒', '🦷']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(modules.length === 4, '应有四个学习模块')
modules.forEach((module) => {
  assert(module.items.length === expectedCounts[module.id], `${module.id} 内容数量不正确`)
  module.items.forEach((unit) => {
    const files = module.id === 'hanzi'
      ? [unit.characterAudioFile, unit.phraseAudioFile]
      : [unit.audioFile]
    files.forEach((file) => {
      const audioPath = file[0] === '/' ? path.join(__dirname, '..', file) : path.join(audioDir, file)
      assert(fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0, `${unit.id} 缺少音频：${file}`)
    })
    if (module.id === 'hanzi') {
      assert(unit.imageFile, `${unit.id} 缺少图片配置`)
      assert(fs.existsSync(path.join(__dirname, '..', unit.imageFile)), `${unit.id} 缺少图片：${unit.imageFile}`)
    }
  })
})

assert(modules[0].items.map((item) => item.title).join('') === expectedHanzi + require('./hanzi-reading-added-3.json').join('') + require('../data/hanzi-school').added.map(row => row[0]).join(''), '汉字资源编号顺序不一致')
assert(new Set(modules[0].items.map((item) => item.title)).size === 475, '识字内容不应包含重复汉字')
originalHanzi.split('').forEach((title, index) => {
  const unit = modules[0].items[index]
  assert(unit.title === title && unit.id === `hanzi-${String(index + 1).padStart(2, '0')}`, '原有汉字编号不能改变，以保留学习记录')
})
assert(fs.readdirSync(imageDir).filter((file) => /^hanzi-\d{2}-.*\.png$/.test(file)).length === 40, '识字图片数量应为 40 张')
assert(fs.readdirSync(extraImageDir).filter((file) => /^hanzi-\d{2}-.*\.png$/.test(file)).length === 38, '新增识字图片数量应为 38 张')
assert(modules.reduce((sum, module) => sum + module.items.length, 0) === 566, '应有 566 个学习单元')
unsupportedEmoji.forEach((emoji) => assert(!learningSource.includes(emoji), `存在兼容性较差的图标：${emoji}`))
console.log('内容检查通过：4 个模块、566 个学习单元、离线语音及 475 张字卡配图均完整，原有汉字编号保持不变。')
