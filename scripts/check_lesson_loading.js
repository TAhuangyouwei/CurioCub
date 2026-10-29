;(async () => {
require('./lesson-test-fixture')
const assert = require('assert')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { getModule } = require('../data/learning')
const { saveRange, exitRange } = require('../utils/hanzi-settings')
const store = new Map()
global.wx = {
  getStorageSync: key => key === 'curiocub-hanzi-settings-v1' ? { ...store.get(key), autoRead: false } : store.get(key),
  setStorageSync: (key, value) => store.set(key, value),
  redirectTo(options) { redirects.push(options.url) }
}
global.getApp = () => ({ globalData: { audio: { stop() {} } } })
let redirects = []
function lesson(unitId) {
  const definition = createLessonPage()
  const payloads = []
  const page = { ...definition, data: { ...definition.data }, setData(changes, callback) {
    payloads.push(changes); Object.assign(this.data, changes); if (callback) callback()
  } }
  page.onLoad({ moduleId: 'hanzi', unitId })
  page.initialBytes = payloads.reduce((total, value) => total + Buffer.byteLength(JSON.stringify(value)), 0)
  return page
}
const first = lesson('hanzi-01')
assert(first.data.lessonItems.length <= 3, '首屏只能渲染当前字和相邻字，不能一次创建全部字卡')
assert(!first.data.module.items, '完整词表只留在逻辑层，不要重复传给页面')
assert(first.initialBytes < 10000, '初始页面数据应控制在 10 KB 内')
for (let i = 1; i < 39; i++) {
  const slot = first.data.lessonItems.findIndex(unit => unit.id === first.lessonItems[i].id)
  assert(slot >= 0, '下一字必须已准备好')
  first.onSwiperChange({ detail: { current: slot, source: 'touch' } })
  assert.strictEqual(first.data.currentIndex, i)
  first.onSwiperAnimationFinish()
  assert(first.data.lessonItems.length <= 3)
  assert.strictEqual(first.data.lessonItems[first.data.swiperIndex].id, first.data.unit.id)
}
const before = first.data.unit.id
first.onSwiperChange({ detail: { current: 0, source: '' } })
assert.strictEqual(first.data.unit.id, before, '窗口归位产生的程序事件不能再次换字')
first.onSwiperChange({ detail: { current: 0, source: 'touch' } })
first.onSwiperAnimationFinish()
assert.strictEqual(first.data.currentIndex, 37, '反向滑动仍正常')
const edge = lesson('hanzi-40')
const target = edge.data.lessonItems.findIndex(unit => unit.id === 'hanzi-41')
edge.onSwiperChange({ detail: { current: target, source: 'touch' } })
assert.strictEqual(redirects.length, 0, '跨包换字不得整页刷新')
assert.strictEqual(edge.data.unit.id, 'hanzi-41')
const units = getModule('hanzi').items
saveRange(units[0].id, units[9].id)
const range = lesson(units[0].id)
assert(range.data.lessonItems.some(unit => unit.id === units[9].id), '范围首字应准备好末字供反向循环')
range.onSwiperChange({ detail: { current: 0, source: 'touch' } })
range.onSwiperAnimationFinish()
assert.strictEqual(range.data.unit.id, units[9].id)
range.onSwiperChange({ detail: { current: 2, source: 'touch' } })
range.onSwiperAnimationFinish()
assert.strictEqual(range.data.unit.id, units[0].id)
for (const length of [1, 2, 3]) {
  saveRange(units[0].id, units[length - 1].id)
  const page = lesson(units[0].id)
  assert.strictEqual(page.data.lessonItems.length, length)
  assert.strictEqual(page.data.swiperCircular, length > 1)
}
exitRange()
const last = lesson(first.lessonItems.at(-1).id)
assert.strictEqual(last.data.swiperIndex, last.data.lessonItems.length - 1)
console.log(`学习首屏检查通过：${first.initialBytes} 字节、最多 3 张字卡、连续/反向滑动、跨包和范围循环。`)

})().catch(error => { console.error(error); process.exitCode = 1 })
