;(async () => {
require('./lesson-test-fixture')
const assert = require('assert')
const fs = require('fs')
const { getModule } = require('../data/learning')
const { getProgress, completeUnit, markUnitUnlearned } = require('../utils/progress')
const { orderedHanzi, saveOrder, saveRange, getHanziSettings } = require('../utils/hanzi-settings')

const store = new Map()
const toasts = []
let definition
let navigation
global.Page = page => { definition = page }
global.wx = {
  getStorageSync: key => store.has(key) ? JSON.parse(JSON.stringify(store.get(key))) : null,
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  setNavigationBarTitle() {}, showToast: options => toasts.push(options),
  navigateTo: options => { navigation = options.url }
}
require('../pages/module/module')
function page(moduleId = 'hanzi') {
  const instance = { ...definition, data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes) {
      for (const [key, value] of Object.entries(changes)) {
        const nested = key.match(/^groups\[(\d+)\]\.collapsed$/)
        if (nested) this.data.groups[Number(nested[1])].collapsed = value
        else this.data[key] = value
      }
    } }
  instance.onLoad({ moduleId })
  instance.onShow()
  return instance
}
const event = groupIndex => ({ currentTarget: { dataset: { groupIndex } } })
let map = page()
assert(map.data.groups.every(group => group.collapsed), '识字各站默认收起，方便快速浏览')
assert(map.data.groups[0].preview.includes('土'))
await map.openGroup(event(0))
assert.strictEqual(navigation, `/pages/lesson/lesson?moduleId=hanzi&unitId=${map.data.groups[0].startUnitId}`, '点击未开始的站点直接进入首字')
assert(map.data.groups[0].collapsed, '点击站点开始学习无需展开')
map.toggleGroup(event(0))
assert.strictEqual(map.data.groups[0].collapsed, false)
assert.strictEqual(map.data.groups[1].collapsed, true, '展开一站不应改变其他站')
map.onShow()
assert.strictEqual(map.data.groups[0].collapsed, false, '从字卡返回时保留展开状态')
map.toggleGroup(event(0))
assert.strictEqual(map.data.groups[0].collapsed, true)
assert.strictEqual(store.has('curiocub-progress-v1'), false, '折叠不能修改学习记录')

const first = map.data.groups[0].items
completeUnit(first[0].id, 'hanzi')
completeUnit(first[1].id, 'hanzi')
markUnitUnlearned(first[1].id, 'hanzi')
markUnitUnlearned(first[2].id, 'hanzi')
completeUnit('math-01', 'math')
map.onShow()
const markup = fs.readFileSync(require.resolve('../pages/module/module.wxml'), 'utf8')
assert(/class="group-header[^>]*bindtap="openGroup"/.test(markup), '站点标题直接开始学习')
assert(/class="group-preview"[^>]*bindtap="openGroup"/.test(markup), '收起的字表预览也可以直接开始学习')
assert(/class="group-toggle"[^>]*catchtap="toggleGroup"/.test(markup), '展开入口独立操作，不能同时进入学习')
assert(/<text[^>]*class="group-state group-start"[^>]*catchtap="openLesson"[^>]*data-unit-id="{{item.startUnitId}}"/.test(markup), '进行中的站点应直接打开本站范围内的第一个字，且不触发展开')
await map.openGroup(event(0))
assert.strictEqual(navigation, `/pages/lesson/lesson?moduleId=hanzi&unitId=${first[0].id}`)
await map.openLesson({ currentTarget: { dataset: { unitId: map.data.groups[0].items[0].id } } })
assert.strictEqual(navigation, `/pages/lesson/lesson?moduleId=hanzi&unitId=${first[0].id}`, '即使第一个字已经学会，也应从本站第一个字进入')
assert(map.data.groups[0].collapsed, '直接进入学习不应改变本站折叠状态')
map.toggleGroup(event(0))
await map.openLesson({ currentTarget: { dataset: { unitId: first[3].id } } })
assert.strictEqual(navigation, `/pages/lesson/lesson?moduleId=hanzi&unitId=${first[3].id}`, '展开后仍可进入指定的字')
map.toggleGroup(event(0))
const before = getProgress()
map.markGroupLearned(event(0))
const learned = getProgress()
first.forEach(unit => {
  assert(learned.completedIds[unit.id])
  assert(!learned.unlearnedIds[unit.id], '本站生字应同步移出生字本')
})
assert(learned.completedIds['math-01'], '保留其他模块记录')
assert(!learned.completedIds[map.data.groups[1].items[0].id], '只能标记当前站')
assert.strictEqual(learned.stars, before.stars + 8, '已领取过奖励的字不得重复加星')
assert.strictEqual(learned.stickerCount, Math.floor(learned.stars / 4))
assert.strictEqual(map.data.groups[0].completed, first.length)
assert(map.data.groups[0].complete && map.data.groups[0].collapsed)
assert.strictEqual(map.data.learnedCount, first.length)
assert.strictEqual(map.data.unlearnedCount, 0)
assert.strictEqual(map.data.stars, learned.stars)
const saved = JSON.stringify(learned)
const toastCount = toasts.length
map.markGroupLearned(event(0))
assert.strictEqual(JSON.stringify(getProgress()), saved)
assert.strictEqual(toasts.length, toastCount, '全站已学会时重复点击不应再提示或奖励')
markUnitUnlearned(first[1].id, 'hanzi')
map.onShow()
map.markGroupLearned(event(0))
assert.strictEqual(getProgress().stars, learned.stars, '重新标记整站也不能重复领奖')

const ordered = orderedHanzi()
const electric = ordered.find(unit => unit.title === '电')
const reordered = [electric, ...ordered.filter(unit => unit.id !== electric.id)]
saveOrder(reordered.map(unit => unit.id))
saveRange(electric.id, electric.id)
map = page()
await map.openLesson({ currentTarget: { dataset: { unitId: electric.id } } })
assert.strictEqual(navigation, `/pages/lesson/lesson?moduleId=hanzi&unitId=${electric.id}`, '自定义顺序后的首字应进入正确音频分包')
navigation = null
await map.openLesson({ currentTarget: { dataset: { unitId: map.data.groups[1].items[0].id } } })
assert.strictEqual(navigation, null, '直接进入学习仍须遵守家长设置的学习范围')
const settings = JSON.stringify(getHanziSettings())
navigation = null
await map.openGroup(event(1))
assert.strictEqual(navigation, null, '范围外灰色站点不能点击进入学习')
saveRange(map.data.groups[0].items[3].id, map.data.groups[0].items[5].id)
map.onShow()
await map.openGroup(event(0))
assert.strictEqual(navigation, `/pages/lesson/lesson?moduleId=hanzi&unitId=${map.data.groups[0].items[3].id}`, '部分字在范围内的站点从范围内首字开始')
saveRange(electric.id, electric.id)
map.onShow()
map.markGroupLearned(event(0))
assert(getProgress().completedIds[electric.id], '按当前屏幕分站标记，兼容自定义顺序')
assert(map.data.groups[0].items.every(unit => getProgress().completedIds[unit.id]), '全部学会作用于整站')
assert.strictEqual(JSON.stringify(getHanziSettings()), settings, '批量标记不改学习范围与排序')
map.exitLearningRange()
const last = map.data.groups.at(-1)
assert.strictEqual(last.total, 5)
map.toggleGroup(event(last.index))
map.markGroupLearned(event(last.index))
assert(map.data.groups.at(-1).complete, '最后不足十字的一站也能全部学会')
assert.strictEqual(map.data.groups.at(-1).collapsed, false, '批量标记后保留本站的展开状态')

for (const index of [-1, 9999, 0.5, 'bad']) {
  const beforeInvalid = JSON.stringify(map.data)
  const progress = JSON.stringify(getProgress())
  map.toggleGroup(event(index))
  await map.openGroup(event(index))
  map.markGroupLearned(event(index))
  assert.strictEqual(JSON.stringify(map.data), beforeInvalid)
  assert.strictEqual(JSON.stringify(getProgress()), progress)
}
for (const moduleId of ['math', 'english']) {
  const other = page(moduleId)
  assert(other.data.groups.every(group => !group.collapsed), '其他模块维持原有展示')
  const data = JSON.stringify(other.data)
  const progress = JSON.stringify(getProgress())
  other.toggleGroup(event(0))
  navigation = null
  await other.openGroup(event(0))
  assert.strictEqual(navigation, null, '其他模块的站点标题维持原有行为')
  other.markGroupLearned(event(0))
  assert.strictEqual(JSON.stringify(other.data), data)
  assert.strictEqual(JSON.stringify(getProgress()), progress)
}
assert.strictEqual(map.data.groups.flatMap(group => group.items).length, getModule('hanzi').items.length)
store.clear()
store.set('curiocub-progress-v1', { completedIds: { 'hanzi-01': true }, stars: 1, stickerCount: 0, lastModuleId: 'hanzi' })
const legacy = page()
legacy.markGroupLearned(event(0))
assert.strictEqual(getProgress().stars, 10, '旧格式进度迁移后，已有星星不能再奖励一次')
assert(getProgress().rewardedIds['hanzi-01'])
console.log('分站操作检查通过：独立折叠/返回保留、整站学会、生字本与统计、奖励防重复、自定义顺序、末站与模块隔离。')

})().catch(error => { console.error(error); process.exitCode = 1 })
