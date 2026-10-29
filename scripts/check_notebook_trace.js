;(async () => {
require('./lesson-test-fixture')
const assert = require('assert')
const { getModule } = require('../data/learning')
const { markUnitUnlearned, completeUnit } = require('../utils/progress')
const { saveRange, setAutoRead } = require('../utils/hanzi-settings')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { createTracePage } = require('../pages/trace/trace-page')
const { startHanziLesson } = require('../utils/start-lesson')
const store = new Map()
let navigation
global.getApp = () => ({ globalData: { audio: { stop() {} } } })
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  navigateTo: options => { navigation = options.url },
  redirectTo: options => { navigation = options.url },
  reLaunch: options => { navigation = options.url },
  getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, screenHeight: 667, pixelRatio: 2 }),
  showToast() {}
}
function instance(definition) {
  return { ...definition, data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes, callback) { Object.assign(this.data, changes); if (callback) callback() } }
}
const units = getModule('hanzi').items
const ids = ['hanzi-01', 'hanzi-41', 'hanzi-302', 'hanzi-458']
setAutoRead(false)
ids.forEach(id => markUnitUnlearned(id, 'hanzi'))
completeUnit('hanzi-02', 'hanzi')
saveRange('hanzi-02', 'hanzi-04')
const entry = {}
await startHanziLesson(entry, units[40], 'notebook')
assert.strictEqual(navigation, '/pages/lesson/lesson?moduleId=hanzi&unitId=hanzi-41&source=notebook', '开启范围也应进入点选的生字')
const lesson = instance(createLessonPage())
lesson.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-41', source: 'notebook' })
assert(lesson.data.isNotebook && !lesson.data.rangeEnabled)
assert.deepStrictEqual(lesson.lessonItems.map(unit => unit.id), ids, '生字本不应被全局范围覆盖')
lesson.openTrace()
assert.strictEqual(navigation, '/packages/hanzi-practice/pages/trace/index?unitId=hanzi-41&source=notebook', '临摹入口必须保留生字本来源')
function swipeTo(page, id) {
  const slot = page.data.lessonItems.findIndex(unit => unit.id === id)
  assert(slot >= 0, '循环目标字必须位于相邻字卡中')
  page.onSwiperChange({ detail: { current: slot, source: 'touch' } })
  page.onSwiperAnimationFinish({ detail: { source: 'touch' } })
  assert.strictEqual(page.data.unit.id, id)
}
lesson.setCurrentCard(ids.length - 1)
swipeTo(lesson, ids[0])
assert.strictEqual(lesson.data.currentNumber, 1)
swipeTo(lesson, ids.at(-1))
assert.strictEqual(lesson.data.currentNumber, ids.length)
const definition = createTracePage(success => success(require('../packages/hanzi-writing/utils/stroke-guide')))
function trace(unitId, source = 'notebook') {
  const page = instance(definition)
  page.onLoad({ unitId, source })
  return page
}
let page = trace('hanzi-41')
assert.deepStrictEqual(page.units.map(unit => unit.id), ids, '临摹只使用明确标记未学会的字')
assert.strictEqual(page.data.currentNumber, 2)
assert.strictEqual(page.data.total, ids.length)
assert.strictEqual(page.data.rangeEnabled, false)
page.previousCharacter()
assert.strictEqual(page.data.unit.id, ids[0])
page.previousCharacter()
assert.strictEqual(page.data.unit.id, ids.at(-1), '首字反向循环到本中末字')
assert(page.data.hasPrevious && page.data.hasNext)
page.nextCharacter()
assert.strictEqual(page.data.unit.id, ids[0], '末字正向循环到本中首字')
for (const id of ids.slice(1)) {
  page.nextCharacter()
  assert.strictEqual(page.data.unit.id, id, '跨分站及分包换字不能混入已学或未学习的字')
}
page.nextCharacter()
assert.strictEqual(page.data.unit.id, ids[0], '末字应回到本中首字')
page.onSwipeStart({ touches: [{ clientX: 100, clientY: 100 }] })
page.onSwipeEnd({ changedTouches: [{ clientX: 200, clientY: 100 }] })
assert.strictEqual(page.data.unit.id, ids.at(-1), '首字右滑应回到末字')
page.onSwipeStart({ touches: [{ clientX: 200, clientY: 100 }] })
page.onSwipeEnd({ changedTouches: [{ clientX: 100, clientY: 100 }] })
assert.strictEqual(page.data.unit.id, ids[0], '末字左滑应回到首字')
page.onUnload()
completeUnit('hanzi-41', 'hanzi')
page = trace('hanzi-01')
assert.deepStrictEqual(page.units.map(unit => unit.id), ids.filter(id => id !== 'hanzi-41'), '重新临摹应移除已学会的字')
page.onUnload()
for (const length of [3, 2, 1]) {
  const remaining = ids.slice(0, length)
  ids.forEach(id => completeUnit(id, 'hanzi'))
  remaining.forEach(id => markUnitUnlearned(id, 'hanzi'))
  const shortLesson = instance(createLessonPage())
  shortLesson.onLoad({ moduleId: 'hanzi', unitId: remaining.at(-1), source: 'notebook' })
  assert.strictEqual(shortLesson.data.swiperCircular, length > 1)
  swipeTo(shortLesson, remaining[0])
  swipeTo(shortLesson, remaining.at(-1))
  const shortTrace = trace(remaining.at(-1))
  shortTrace.nextCharacter()
  assert.strictEqual(shortTrace.data.unit.id, remaining[0])
  shortTrace.previousCharacter()
  assert.strictEqual(shortTrace.data.unit.id, remaining.at(-1))
  assert.strictEqual(shortTrace.data.hasNext, length > 1)
  assert.strictEqual(shortTrace.data.hasPrevious, length > 1)
  shortTrace.onUnload()
}
ids.forEach(id => completeUnit(id, 'hanzi'))
navigation = null
page = trace('hanzi-01')
assert.strictEqual(page.data.unit, null)
assert.strictEqual(navigation, '/pages/notebook/notebook', '空生字本不能回退到全量或范围练习')
page = trace('hanzi-02', '')
assert.deepStrictEqual(page.units.map(unit => unit.id), ['hanzi-02', 'hanzi-03', 'hanzi-04'], '普通范围临摹仍应保留已学会的字')
page.onUnload()
let legacy
global.Page = value => { legacy = value }
for (const route of ['../pages/trace/trace', '../packages/hanzi-writing/pages/trace/index']) {
  require(route)
  legacy.onLoad({ unitId: 'hanzi-41', source: 'notebook' })
  assert.strictEqual(navigation, '/packages/hanzi-practice/pages/trace/index?unitId=hanzi-41&source=notebook', '旧临摹入口也应保留生字本来源')
}
console.log('生字本检查通过：学习和临摹首尾循环、滑动和按钮、1/2/3/4 字、范围隔离、仅未学会、计数、学会移除、空本与旧入口。')
})().catch(error => { console.error(error); process.exitCode = 1 })
