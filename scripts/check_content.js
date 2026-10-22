const fs = require('fs')
const path = require('path')
const { modules } = require('../data/learning')

const expectedCounts = { hanzi: 78, pinyin: 12, math: 16, english: 12 }
const originalHanzi = '土五中上天禾人尺头下虫把口子水你山牙长比四西小了手我去东心必女力月儿巴几九与马鸟'
const expectedHanzi = originalHanzi + '一泪眉耳三舌足身二牛羊六鱼七日云风八雨雪雷电田木米果十瓜苗明尖李姜言午弓张许'
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

assert(modules[0].items.map((item) => item.title).join('') === expectedHanzi, '78 个汉字顺序不一致')
assert(new Set(modules[0].items.map((item) => item.title)).size === 78, '识字内容不应包含重复汉字')
originalHanzi.split('').forEach((title, index) => {
  const unit = modules[0].items[index]
  assert(unit.title === title && unit.id === `hanzi-${String(index + 1).padStart(2, '0')}`, '原有汉字编号不能改变，以保留学习记录')
})
assert(fs.readdirSync(imageDir).filter((file) => /^hanzi-\d{2}-.*\.png$/.test(file)).length === 40, '识字图片数量应为 40 张')
assert(fs.readdirSync(extraImageDir).filter((file) => /^hanzi-\d{2}-.*\.png$/.test(file)).length === 38, '新增识字图片数量应为 38 张')
assert(modules.reduce((sum, module) => sum + module.items.length, 0) === 118, '应有 118 个学习单元')
unsupportedEmoji.forEach((emoji) => assert(!learningSource.includes(emoji), `存在兼容性较差的图标：${emoji}`))
console.log('内容检查通过：4 个模块、118 个学习单元、196 段语音及 78 张识字图片均完整，原有汉字编号保持不变。')
