const assert = require('assert')
const fs = require('fs')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { saveRange, exitRange, setAutoRead } = require('../utils/hanzi-settings')
const store = new Map()
let definition
let navigation
let toast
const app = { globalData: { audio: { stop() {} } } }
global.getApp = () => app
global.Page = page => { definition = page }
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  navigateTo: options => { navigation = options.url },
  redirectTo: options => { navigation = options.url },
  showToast: options => { toast = options.title },
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
range.saveAndStart()
map.onShow()
assert(map.data.rangeEnabled)
assert.strictEqual(navigation, '/pages/lesson/lesson?moduleId=hanzi&unitId=hanzi-40')
const page = lesson('hanzi-40')
assert.strictEqual(page.data.currentNumber, 1)
assert.strictEqual(page.data.cardTotal, 3)
assert.deepStrictEqual(page.lessonItems.map(u => u.id), units.slice(39, 42).map(u => u.id))
page.markLearned()
assert.strictEqual(page.lessonItems.length, 3, '学会的字仍留在范围内')
page.onCardChange({ detail: { current: 2 } })
assert(navigation.includes('hanzi-42'))
const last = lesson('hanzi-42')
last.onCardChange({ detail: { current: 0 } })
assert.strictEqual(navigation, '/pages/lesson/lesson?moduleId=hanzi&unitId=hanzi-40', '末字正向循环可跨包回首字')
page.onCardChange({ detail: { current: 2 } })
assert(navigation.includes('hanzi-42'), '首字反向循环可跨包回末字')
assert.strictEqual(lesson('hanzi-01').data.unit.id, 'hanzi-40', '直接入口不能进入范围外汉字')
assert.strictEqual(lesson('hanzi-40', 'notebook').lessonItems.length, 3, '范围内学会的字不能因生字本过滤消失')
navigation = null
map.openLesson({ currentTarget: { dataset: { unitId: 'hanzi-01' } } })
assert.strictEqual(navigation, null)
assert(toast.includes('范围外'))
saveRange(units[0].id, units[0].id)
assert.strictEqual(lesson('hanzi-01').lessonItems.length, 1)
exitRange()
assert.strictEqual(lesson('hanzi-01').lessonItems.length, units.length)
map.onShow()
assert(!map.data.rangeEnabled)
const template = fs.readFileSync(require.resolve('../pages/lesson/lesson.wxml'), 'utf8')
assert(template.includes('circular="{{rangeEnabled && lessonItems.length > 1}}"'))
console.log('范围页面检查通过：整页点选入口、保存/重进、跨包双向循环、学会保留、单字、范围外入口和退出。')
