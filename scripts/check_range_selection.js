const assert = require('assert')
const { getModule } = require('../data/learning')
const { getHanziSettings, saveRange, setAutoRead } = require('../utils/hanzi-settings')
const { completeUnit, markUnitUnlearned } = require('../utils/progress')
let definition
let navigation
const store = new Map()
global.Page = page => { definition = page }
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  redirectTo: options => { navigation = options.url }
}
setAutoRead(false)
completeUnit('hanzi-01', 'hanzi')
markUnitUnlearned('hanzi-02', 'hanzi')
require('../pages/learning-range/learning-range')
function page() {
  const instance = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
  instance.onLoad()
  return instance
}
const units = getModule('hanzi').items
const select = (page, index) => page.selectCharacter({ currentTarget: { dataset: { index } } })
let selection = page()
assert.strictEqual(selection.data.units.length, units.length)
assert.strictEqual(selection.data.units[0].status, 'learned')
assert.strictEqual(selection.data.units[1].status, 'unlearned')
assert.strictEqual(selection.data.units[2].status, 'unseen')
selection.saveAndStart()
assert(!getHanziSettings().rangeEnabled, '尚未点选完整范围时不能保存')
select(selection, 39)
assert.strictEqual(selection.data.selecting, 'end')
assert(!selection.data.rangeReady)
select(selection, 41)
assert.strictEqual(selection.data.rangeStart, 39)
assert.strictEqual(selection.data.rangeEnd, 41)
assert.strictEqual(selection.data.rangeCount, 3)
assert(selection.data.rangeReady)
selection.saveAndStart()
assert.strictEqual(getHanziSettings().startId, units[39].id)
assert.strictEqual(getHanziSettings().endId, units[41].id)
assert.strictEqual(getHanziSettings().autoRead, false)
assert.strictEqual(navigation, '/pages/lesson/lesson?moduleId=hanzi&unitId=hanzi-40')
selection = page()
assert(selection.data.rangeReady)
assert.strictEqual(selection.data.rangeStart, 39)
select(selection, 70)
select(selection, 60)
assert.strictEqual(selection.data.rangeStart, 60)
assert.strictEqual(selection.data.rangeEnd, 70, '反向点选也应得到连续范围')
select(selection, 100)
select(selection, 100)
assert.strictEqual(selection.data.rangeCount, 1)
selection.saveAndStart()
assert(navigation.includes('/packages/hanzi-reading-1/pages/lesson/index'))
assert.strictEqual(getHanziSettings().startId, units[100].id)
const beforeInvalid = JSON.stringify(selection.data)
select(selection, -1)
select(selection, 9999)
assert.strictEqual(JSON.stringify(selection.data), beforeInvalid)
saveRange(units[0].id, units.at(-1).id)
selection = page()
assert.strictEqual(selection.data.rangeCount, units.length)
console.log('整页点选检查通过：全字表、状态标记、起止点选、整段范围、反向/单字选择、保存恢复和跨包入口。')
