const assert = require('assert')
const { getProgress } = require('../utils/progress')
const store = new Map()
let definition
const routes = []
const audio = { stop() {}, play() {}, onError() {}, offError() {}, onEnded() {}, offEnded() {}, onCanplay() {}, offCanplay() {} }
global.getApp = () => ({ globalData: { audio } })
global.Page = (page) => { definition = page }
global.wx = {
  getStorageSync: (key) => store.has(key) ? JSON.parse(JSON.stringify(store.get(key))) : null,
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  navigateTo: (options) => routes.push(options.url), redirectTo: (options) => routes.push(options.url),
  navigateBack: () => routes.push('back'), reLaunch: (options) => routes.push(options.url), showToast() {}
}
function instance(file, options = {}) {
  require(file)
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes) { Object.assign(this.data, changes) } }
  page.onLoad(options)
  page.onShow()
  return page
}
const today = instance('../packages/hanzi-practice/pages/today/index')
assert.strictEqual(today.data.total, 3)
today.playCharacter()
assert(audio.src.startsWith('/packages/hanzi-practice/audio/hanzi-'))
for (let index = 0; index < 3; index++) today.finish({ currentTarget: { dataset: { learned: 'yes' } } })
assert(today.data.practiceDone && today.data.reading)
assert.strictEqual(getProgress().stars, 3)
today.finish({ currentTarget: { dataset: { learned: 'yes' } } })
assert.strictEqual(getProgress().stars, 3, '完成页面不能重复领奖')
today.openReading()
assert(routes.at(-1).endsWith('reading/index?today=1'))
const reader = instance('../packages/hanzi-practice/pages/reading/index', { today: '1' })
assert.strictEqual(reader.data.sentence.text, '人上山。')
assert.strictEqual(reader.data.showPinyin, false)
reader.togglePinyin()
assert(reader.data.showPinyin)
reader.playCharacter({ currentTarget: { dataset: { index: 2 } } })
assert.strictEqual(audio.src, '/packages/hanzi-practice/audio/hanzi-17.mp3')
reader.playSentence()
assert.strictEqual(audio.src, reader.data.sentence.audio)
reader.finish()
assert.strictEqual(routes.at(-1), 'back')
today.onShow()
assert(today.data.readingDone, '阅读完成返回今日页应立即更新状态')
assert.strictEqual(getProgress().stars, 3, '阅读记录不能再次奖励识字星星')
const before = audio.src
reader.playCharacter({ currentTarget: { dataset: { index: 3 } } })
assert.strictEqual(audio.src, before, '标点不能播放不存在的录音')
reader.onHide()
today.onUnload()
console.log('学习页面检查通过：首次完整学习到读句、点字/整句播放、拼音开关、阅读返回状态、空点与奖励防重复。')
