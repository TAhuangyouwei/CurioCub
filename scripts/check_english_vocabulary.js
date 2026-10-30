const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { groups, words } = require('../data/english-vocabulary')
const { getModule, modules } = require('../data/learning')
const stickers = require('../data/stickers')
assert.strictEqual(groups.length, 15)
assert.strictEqual(words.length, 150)
assert.strictEqual(new Set(words.map(word => word.word)).size, 150, '150 个词不能靠同词不同义重复计数')
assert.strictEqual(new Set(words.map(word => word.id)).size, 150)
for (const group of groups) assert.strictEqual(words.filter(word => word.topic === group.id).length, 10)
for (const word of words) {
  assert(word.meaning && word.subject && groups.some(group => group.id === word.topic))
  assert(/^[a-z]+$/.test(word.word))
  assert(fs.statSync(path.join(__dirname, '..', word.image)).size > 0, `${word.word} 缺少图片`)
  assert(fs.statSync(path.join(__dirname, '..', word.audioFile)).size > 0, `${word.word} 缺少录音`)
}
for (const unit of getModule('english').items) assert(words.some(word => word.word === unit.title), `原英语内容 ${unit.title} 应保留`)
assert.strictEqual(stickers.length, 141)
assert(stickers.every(([icon, name]) => icon && name), '贴纸图标及名称不能为空')
assert(stickers.length >= Math.floor(modules.reduce((sum, module) => sum + module.items.length, 0) / 4), '贴纸数量应覆盖全部现有学习奖励')
const store = new Map()
let definition
const routes = []
global.getApp = () => ({ globalData: { audio: { stop() {} } } })
global.wx = { navigateTo: options => routes.push(options.url), redirectTo: options => routes.push(options.url),
  getStorageSync: key => store.get(key), setStorageSync: (key, value) => store.set(key, value) }
global.Page = page => { definition = page }
require('../packages/english-vocabulary/pages/cards/index')
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
page.onLoad()
assert.strictEqual(page.data.word.word, 'dog')
assert(page.data.audioFile)
page.previous()
assert.strictEqual(page.data.position, 1)
for (let group = 0; group < groups.length; group++) {
  page.changeTopic({ detail: { value: String(group) } })
  assert.strictEqual(page.data.position, 1)
  assert.strictEqual(page.data.groupTitle, groups[group].title)
  for (let i = 0; i < 9; i++) page.next()
  assert.strictEqual(page.data.position, 10)
  page.next()
  assert.strictEqual(page.data.position, 10)
}
assert(page.data.audioFile.endsWith('/clean.mp3'), '新词卡也应该能听录音')
assert(!('subject' in page.data.word), '图片制作描述不应进入产品界面')
require('../pages/english-listening/english-listening')
definition.onLoad({ topic: 'colors' })
assert.strictEqual(routes.at(-1), '/packages/english-vocabulary/pages/listening/index?topic=colors')
definition.onLoad({ topic: 'actions' })
assert.strictEqual(routes.at(-1), '/packages/english-vocabulary/pages/listening/index?topic=actions')
require('../pages/module/module')
definition.openEnglishVocabulary()
assert.strictEqual(routes.at(-1), '/packages/english-vocabulary/pages/cards/index')
const subpackage = require('../app.json').subpackages.find(item => item.name === 'english-vocabulary')
assert(subpackage && subpackage.pages.includes('pages/cards/index') && subpackage.pages.includes('pages/listening/index'))
for (const file of subpackage.pages) for (const extension of ['js', 'json', 'wxml', 'wxss']) {
  assert(fs.existsSync(path.join(__dirname, '..', subpackage.root, `${file}.${extension}`)))
}
console.log('词库检查通过：15 个主题、150 个不重复生活词及图片、词卡切换、原录音保留、听图跳转；141 张贴纸配置齐全并覆盖现有奖励。')
