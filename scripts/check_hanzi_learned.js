const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')

const hanzi = getModule('hanzi')
assert.strictEqual(hanzi.items.length, 78)
hanzi.items.forEach((unit) => assert(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/.test(unit.pinyin), `${unit.title} 缺少规范拼音`))
const expectedReadings = { 长: 'cháng', 了: 'le', 几: 'jǐ', 与: 'yǔ', 女: 'nǚ', 中: 'zhōng', 一: 'yī', 子: 'zǐ', 儿: 'ér', 许: 'xǔ' }
Object.entries(expectedReadings).forEach(([title, pinyin]) => assert.strictEqual(hanzi.items.find((unit) => unit.title === title).pinyin, pinyin))

let stored = { completedIds: { 'hanzi-01': true, 'hanzi-02': true, 'math-01': true }, stars: 3, stickerCount: 0, lastModuleId: 'math' }
const app = { globalData: { audio: { stop() {} }, lessonRequest: null } }
const routes = []
let backed = 0
global.getApp = () => app
global.wx = {
  getStorageSync: () => JSON.parse(JSON.stringify(stored)),
  setStorageSync(key, value) { stored = JSON.parse(JSON.stringify(value)) },
  navigateTo(options) { routes.push(options.url) },
  navigateBack() { backed += 1 },
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
page.markLearned()
assert.strictEqual(page.data.completed, true)
assert(stored.completedIds['hanzi-03'])
assert(stored.completedIds['math-01'], '不能覆盖其他模块进度')
assert.strictEqual(stored.stars, 4)
assert.strictEqual(stored.stickerCount, 1)
assert.strictEqual(routes[0], '/pages/reward/reward?moduleId=hanzi&unitId=hanzi-03&newSticker=1', '已学会应直接进入奖励，不经过答题')
page.markLearned()
lessonAt('hanzi', 'hanzi-03').markLearned()
assert.strictEqual(stored.stars, 4, '重复点击和再次进入不能重复奖励')
assert.strictEqual(routes.length, 1)

let rewardDefinition
global.Page = (definition) => { rewardDefinition = definition }
require('../pages/reward/reward')
const reward = { ...rewardDefinition, data: {}, setData(changes) { Object.assign(this.data, changes) } }
reward.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-03', newSticker: '1' })
assert(reward.data.newSticker)
reward.continueLearning()
page.onShow()
assert.strictEqual(page.data.unit.id, 'hanzi-04')
assert.strictEqual(page.data.completed, false)
assert.strictEqual(page.data.hintVisible, false)

const extra = lessonAt('hanzi', 'hanzi-78')
extra.markLearned()
assert.strictEqual(stored.stars, 5)
assert.strictEqual(routes[1], '/pages/reward/reward?moduleId=hanzi&unitId=hanzi-78&newSticker=0')
reward.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-78', newSticker: '0' })
assert(reward.data.isLast)
reward.continueLearning()
extra.onShow()
assert.strictEqual(backed, 3, '最后一字的奖励页应正确退回识字地图')

for (const moduleId of ['pinyin', 'math', 'english']) {
  const other = lessonAt(moduleId, `${moduleId}-01`)
  const before = JSON.stringify(stored)
  other.markLearned()
  assert.strictEqual(JSON.stringify(stored), before)
  other.startChallenge()
  assert.strictEqual(routes[routes.length - 1], `/pages/challenge/challenge?moduleId=${moduleId}&unitId=${moduleId}-01`)
}
const template = fs.readFileSync(path.join(__dirname, '../pages/lesson/lesson.wxml'), 'utf8')
assert(/<button wx:if="\{\{isHanzi\}\}"[^>]*bindtap="markLearned"/.test(template))
assert(/<button wx:else[^>]*bindtap="startChallenge"/.test(template))
console.log('已学会检查通过：78 个拼音、完成记录、奖励防重复、贴纸、下一张/组末返回与其他模块闯关均正常。')
