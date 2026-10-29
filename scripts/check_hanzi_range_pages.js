;(async () => {
require('./lesson-test-fixture')
const assert = require('assert')
const fs = require('fs')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { getLearningPage } = require('../utils/learning-navigation')
const { saveRange, exitRange, setAutoRead } = require('../utils/hanzi-settings')
const store = new Map()
const timers = new Map()
let timerId = 0
global.setTimeout = callback => { timers.set(++timerId, callback); return timerId }
global.clearTimeout = id => timers.delete(id)
const flush = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()) }
const played = []
const toasts = []
let definition
let navigation
let toast
const app = { globalData: { audio: { stop() {}, play() { played.push(this.src) }, onError() {}, offError() {}, onCanplay() {}, offCanplay() {}, onEnded() {}, offEnded() {} } } }
global.getApp = () => app
require('./lesson-test-fixture').readyAudio(app.globalData.audio)
global.Page = page => { definition = page }
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  navigateTo: options => { navigation = options.url },
  redirectTo: options => { navigation = options.url },
  showToast: options => { toast = options.title; toasts.push(options.title) },
  loadSubpackage: options => options.fail({ errMsg: 'already in current lesson package' }),
  setNavigationBarTitle() {}
}
function instance(definition) {
  return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
}
function lesson(unitId, source) {
  const page = instance(createLessonPage())
  page.onLoad({ moduleId: 'hanzi', unitId, source })
  return page
}
const units = getModule('hanzi').items
setAutoRead(false)
require('../pages/module/module')
const map = instance(definition)
map.onLoad({ moduleId: 'hanzi' })
map.onShow()
map.editRange()
assert.strictEqual(navigation, '/pages/learning-range/learning-range')
require('../pages/learning-range/learning-range')
const range = instance(definition)
range.onLoad()
assert.strictEqual(range.data.units[39].title, '鸟')
range.selectCharacter({ currentTarget: { dataset: { index: 39 } } })
range.selectCharacter({ currentTarget: { dataset: { index: 41 } } })
assert.strictEqual(range.data.rangeCount, 3)
await range.saveAndStart()
map.onShow()
assert(map.data.rangeEnabled)
assert.strictEqual(navigation, '/pages/lesson/lesson?moduleId=hanzi&unitId=hanzi-40')
const page = lesson('hanzi-40')
assert.strictEqual(page.data.currentNumber, 1)
assert.strictEqual(page.data.cardTotal, 3)
assert.deepStrictEqual(page.lessonItems.map(u => u.id), units.slice(39, 42).map(u => u.id))
page.markLearned()
assert.strictEqual(page.lessonItems.length, 3, '学会的字仍留在范围内')
await page.onCardChange({ detail: { current: 2 } })
assert.strictEqual(page.data.unit.id, 'hanzi-42')
const last = lesson('hanzi-42')
await last.onCardChange({ detail: { current: 0 } })
assert.strictEqual(last.data.unit.id, 'hanzi-40', '末字正向循环仍在原页面回首字')
await page.onCardChange({ detail: { current: 2 } })
assert.strictEqual(page.data.unit.id, 'hanzi-42', '首字反向循环可跨包回末字')
assert.strictEqual(lesson('hanzi-01').data.unit.id, 'hanzi-40', '直接入口不能进入范围外汉字')
navigation = null
assert.strictEqual(lesson('hanzi-40', 'notebook').lessonItems.length, 0, '生字本为空时不能被范围内汉字填充')
assert.strictEqual(navigation, '/pages/notebook/notebook')
navigation = null
await map.openLesson({ currentTarget: { dataset: { unitId: 'hanzi-01' } } })
assert.strictEqual(navigation, null)
assert(toast.includes('范围外'))
saveRange(units[0].id, units[0].id)
assert.strictEqual(lesson('hanzi-01').lessonItems.length, 1)
exitRange()
assert.strictEqual(lesson('hanzi-01').lessonItems.length, units.length)
map.onShow()
assert(!map.data.rangeEnabled)
setAutoRead(true)
saveRange(units[40].id, units[41].id)
map.onShow()
await map.startRangeLearning()
const rangeEntry = `${getLearningPage('lesson', units[40])}?moduleId=hanzi&unitId=${units[40].id}`
assert.strictEqual(navigation, rangeEntry)
const beforeAudio = toasts.length
const fromParent = lesson(units[40].id)
flush()
assert.strictEqual(played.at(-1), units[40].characterAudioFile, '家长范围入口应直接播放当前分包的字音')
assert.strictEqual(toasts.length, beforeAudio, '已在目标分包内，不应再加载分包并误报声音加载失败')
fromParent.onUnload()
range.onLoad()
await range.saveAndStart()
assert.strictEqual(navigation, rangeEntry)
const fromRangeEditor = lesson(units[40].id)
flush()
assert.strictEqual(played.at(-1), units[40].characterAudioFile)
assert.strictEqual(toasts.length, beforeAudio, '保存范围后开始学习也不应误报音频加载失败')
fromRangeEditor.onUnload()
const template = fs.readFileSync(require.resolve('../pages/lesson/lesson.wxml'), 'utf8')
assert(template.includes('circular="{{swiperCircular}}"'))
console.log('范围页面检查通过：整页点选入口、保存/重进、跨包双向循环、学会保留、单字、范围外入口和退出。')

})().catch(error => { console.error(error); process.exitCode = 1 })
