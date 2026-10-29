const assert = require('assert')
const { orderedHanzi, saveRange } = require('../utils/hanzi-settings')
const { completeUnit, getProgress } = require('../utils/progress')
const store = new Map()
let definition
let navigations = 0
global.Page = value => { definition = value }
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  setNavigationBarTitle() {}, showToast() {}, navigateTo() { navigations++ }
}
require('../pages/module/module')
const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
page.onLoad({ moduleId: 'hanzi' })
const units = orderedHanzi()
saveRange(units[12].id, units[22].id)
page.onShow()
assert.strictEqual(page.data.groups[0].stateLabel, '未开始')
assert(page.data.groups[0].outsideRange)
assert.strictEqual(page.data.groups[1].stateLabel, '进行中', '范围与一站部分重叠也属于进行中')
assert.strictEqual(page.data.groups[1].startUnitId, units[12].id, '点击进行中从本站范围内首字开始')
assert.strictEqual(page.data.groups[2].stateLabel, '进行中')
assert.strictEqual(page.data.groups[3].stateLabel, '未开始')
const event = index => ({ currentTarget: { dataset: { groupIndex: index } } })
const before = JSON.stringify(getProgress())
page.toggleGroup(event(0))
assert(page.data.groups[0].collapsed, '范围外不能展开')
page.markGroupLearned(event(0))
page.openReview(event(0))
assert.strictEqual(JSON.stringify(getProgress()), before, '范围外不能批量改学习记录')
assert.strictEqual(navigations, 0, '范围外不能进入复习')
completeUnit(units[0].id, 'hanzi')
page.onShow()
assert.strictEqual(page.data.groups[0].stateLabel, '未开始', '范围外部分学过也不显示进行中')
units.slice(0, 10).forEach(unit => completeUnit(unit.id, 'hanzi'))
units.slice(10, 20).forEach(unit => completeUnit(unit.id, 'hanzi'))
page.onShow()
assert.strictEqual(page.data.groups[0].stateLabel, '完成', '范围外学完的站保留完成状态')
assert(page.data.groups[0].outsideRange)
assert.strictEqual(page.data.groups[1].stateLabel, '完成', '范围内完成状态优先')
page.exitLearningRange()
assert(page.data.groups.every(group => !group.outsideRange), '退出范围后立即恢复可点击状态')
assert.strictEqual(page.data.groups[3].stateLabel, '未开始')
page.onLoad({ moduleId: 'math' })
page.onShow()
assert(page.data.groups.every(group => !group.outsideRange && !group.collapsed), '其他模块不受影响')
console.log('站点范围状态检查通过：未开始/进行中/完成、部分重叠、范围外禁用及退出恢复。')
