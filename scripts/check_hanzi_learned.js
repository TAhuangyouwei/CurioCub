require('./lesson-test-fixture')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { orderedHanzi } = require('../utils/hanzi-settings')

const hanzi = getModule('hanzi')
assert.strictEqual(hanzi.items.length, 475)
hanzi.items.forEach((unit) => assert(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/.test(unit.pinyin), `${unit.title} 缺少规范拼音`))
const expectedReadings = { 长: 'cháng', 了: 'le', 几: 'jǐ', 与: 'yǔ', 女: 'nǚ', 中: 'zhōng', 一: 'yī', 子: 'zǐ', 儿: 'ér', 许: 'xǔ' }
Object.entries(expectedReadings).forEach(([title, pinyin]) => assert.strictEqual(hanzi.items.find((unit) => unit.title === title).pinyin, pinyin))

let stored = { completedIds: { 'hanzi-01': true, 'hanzi-02': true, 'math-01': true }, stars: 3, stickerCount: 0, lastModuleId: 'math' }
let audioStops = 0
const app = { globalData: { audio: { stop() { audioStops += 1 } }, lessonRequest: null } }
const routes = []
const toasts = []
global.getApp = () => app
global.wx = {
  getStorageSync: (key) => key === 'curiocub-hanzi-settings-v1' ? { autoRead: false } : JSON.parse(JSON.stringify(stored)),
  setStorageSync(key, value) { stored = JSON.parse(JSON.stringify(value)) },
  navigateTo(options) { routes.push(options.url) },
  showToast(options) { toasts.push(options) },
  setNavigationBarTitle() {}
}

function lessonAt(moduleId, unitId) {
  const definition = createLessonPage()
  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes) { Object.assign(this.data, changes) }
  }
  page.onLoad({ moduleId, unitId })
  return page
}

const page = lessonAt('hanzi', 'hanzi-03')
const stopsBeforeMarking = audioStops
page.markLearned()
assert.strictEqual(audioStops, stopsBeforeMarking, '标记已学会不应打断正在播放的读音')
assert.strictEqual(page.data.completed, true)
assert(stored.completedIds['hanzi-03'])
assert(stored.completedIds['math-01'], '不能覆盖其他模块进度')
assert.strictEqual(stored.stars, 4)
assert.strictEqual(stored.stickerCount, 1)
assert.strictEqual(routes.length, 0, '标记已学会不能跳转奖励页')
assert.strictEqual(page.data.unit.id, 'hanzi-03', '标记后保留当前字卡')
assert.strictEqual(toasts.length, 1)
assert(toasts[0].title.includes('贴纸'), '解锁贴纸时应在轻提示中告知')
assert.strictEqual(toasts[0].mask, false, '轻提示不能阻挡学生操作')
assert(toasts[0].duration > 0 && toasts[0].duration <= 1500, '提示应短暂显示后自动消失')
page.markLearned()
lessonAt('hanzi', 'hanzi-03').markLearned()
assert.strictEqual(stored.stars, 4, '重复点击和再次进入不能重复奖励')
assert.strictEqual(routes.length, 0)
assert.strictEqual(toasts.length, 1, '重复点击不能反复弹出提示')

page.onCardChange({ detail: { current: 3 } })
assert.strictEqual(page.data.unit.id, 'hanzi-04')
assert.strictEqual(page.data.completed, false)
assert.strictEqual(page.data.hintVisible, false)

const ordered = orderedHanzi()
const extra = lessonAt('hanzi', ordered.at(-1).id)
extra.markLearned()
assert.strictEqual(stored.stars, 5)
assert.strictEqual(routes.length, 0, '最后一字也不应跳转')
assert.strictEqual(extra.data.unit.id, ordered.at(-1).id)
assert.strictEqual(toasts.length, 2)
assert(!toasts[1].title.includes('贴纸'), '没有解锁贴纸时显示普通鼓励')
extra.onCardChange({ detail: { current: ordered.length - 2 } })
assert.strictEqual(extra.data.unit.id, ordered.at(-2).id, '提示显示期间仍可滑动')

const groupEnd = lessonAt('hanzi', 'hanzi-10')
groupEnd.markLearned()
assert.strictEqual(routes.length, 0, '组末标记也不应离开学习页')
groupEnd.onCardChange({ detail: { current: 10 } })
assert.strictEqual(groupEnd.data.unit.id, 'hanzi-11', '组末仍可直接滑到下一站')

page.showHint({ currentTarget: { dataset: { unitId: 'hanzi-04' } } })
page.markLearned()
const afterFirstLearning = stored.stars
page.markUnlearned()
page.markLearned()
assert.strictEqual(stored.stars, afterFirstLearning, '重新学会只提示，不重复奖励')
assert(!stored.unlearnedIds['hanzi-04'], '重新学会仍须移出生字本')
assert.strictEqual(routes.length, 0)

for (const moduleId of ['pinyin', 'math', 'english']) {
  const other = lessonAt(moduleId, `${moduleId}-01`)
  const before = JSON.stringify(stored)
  other.markLearned()
  assert.strictEqual(JSON.stringify(stored), before)
  other.startChallenge()
  assert.strictEqual(routes[routes.length - 1], `/pages/challenge/challenge?moduleId=${moduleId}&unitId=${moduleId}-01`)
}
const template = fs.readFileSync(path.join(__dirname, '../pages/lesson/lesson.wxml'), 'utf8')
assert(/<view wx:if="\{\{isHanzi\}\}" class="learning-status"/.test(template))
assert(template.includes('bindtap="markLearned"'))
assert(template.includes('bindtap="markUnstudied"'))
assert(/<button wx:else[^>]*bindtap="startChallenge"/.test(template))
console.log('已学会检查通过：458 个拼音、原页轻提示、不阻挡滑动、组末/最后一字、奖励防重复、贴纸、生字本及其他模块闯关均正常。')
