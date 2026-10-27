const assert = require('assert')
const { getUnit } = require('../data/learning')
const { getLearningPage } = require('../utils/learning-navigation')
const stickers = require('../data/stickers')
const { modules } = require('../data/learning')

assert(stickers.length >= Math.floor(modules.reduce((sum, item) => sum + item.items.length, 0) / 4), '新增课程的星星应有对应贴纸可以解锁')

const saved = { completedIds: { 'hanzi-01': true }, stars: 1, stickerCount: 0, lastModuleId: 'hanzi' }
let definition
let navigation
let audioSource
const app = { globalData: { audio: { stop() {}, play() {}, onError() {}, onCanplay() {}, onEnded() {}, set src(value) { audioSource = value } } } }
global.Page = (page) => { definition = page }
global.getApp = () => app
global.wx = {
  getStorageSync() { return saved },
  setStorageSync() {},
  setNavigationBarTitle() {},
  getWindowInfo() { return { windowWidth: 375 } },
  showToast() {},
  navigateTo(options) { navigation = options.url },
  navigateBack(options) { navigation = options },
  redirectTo(options) { navigation = options.url }
}

function loadPage(file) {
  require(file)
  return {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes) { Object.assign(this.data, changes) }
  }
}

const modulePage = loadPage('../pages/module/module')
modulePage.onLoad({ moduleId: 'hanzi' })
modulePage.onShow()
assert.deepStrictEqual(modulePage.data.groups.map((group) => group.total), Array.from({ length: 46 }, (_, i) => i === 45 ? 8 : 10))
assert.strictEqual(modulePage.data.groups[0].items[0].completed, true, '旧字学习记录应保留')
modulePage.data.groups.forEach((group) => assert(!group.locked, '所有识字小组应直接开放'))
modulePage.openLesson({ currentTarget: { dataset: { unitId: 'hanzi-41', locked: false } } })
assert.strictEqual(navigation, '/packages/hanzi-extra/pages/lesson/index?moduleId=hanzi&unitId=hanzi-41')
modulePage.openReview({ currentTarget: { dataset: { groupIndex: 7 } } })
assert.strictEqual(navigation, '/packages/hanzi-extra/pages/review/index?moduleId=hanzi&groupIndex=7')

const lesson = loadPage('../packages/hanzi-extra/pages/lesson/index')
lesson.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-78' })
assert.strictEqual(lesson.data.unit.title, '许')
assert.strictEqual(lesson.data.cardTotal, 10, '原末组补满后应有十张卡')
assert.strictEqual(lesson.data.currentNumber, 8)
lesson.playCharacterAudio()
assert.strictEqual(audioSource, '/packages/hanzi-extra/audio/hanzi-78-character.mp3')
lesson.playPhraseAudio()
assert.strictEqual(audioSource, '/packages/hanzi-extra/audio/hanzi-78-phrase.mp3')
lesson.showHint({ currentTarget: { dataset: { unitId: 'hanzi-78' } } })
assert(lesson.data.hintVisible)
lesson.onCardChange({ detail: { current: 70 } })
assert(!lesson.data.hintVisible)
assert.strictEqual(lesson.data.unit.title, '尖')
lesson.returnToModule()
assert.strictEqual(navigation.delta, 1)

const challenge = loadPage('../packages/hanzi-extra/pages/challenge/index')
challenge.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-41' })
assert.strictEqual(challenge.data.unit.title, '一')
assert(challenge.data.options.includes('一'))
challenge.playQuestionAudio()
assert.strictEqual(audioSource, '/packages/hanzi-extra/audio/hanzi-41-character.mp3')

const review = loadPage('../packages/hanzi-extra/pages/review/index')
review.onLoad({ moduleId: 'hanzi', groupIndex: '7' })
assert.strictEqual(review.data.matches.length, 10)
assert(review.data.targets.every((target) => target.pinyin && !target.imageFile))
assert.strictEqual(getLearningPage('lesson', getUnit('hanzi', 'hanzi-40')), '/pages/lesson/lesson')
assert.strictEqual(getLearningPage('lesson', getUnit('english', 'english-01')), '/pages/lesson/lesson')

modules.forEach((module) => {
  modulePage.onLoad({ moduleId: module.id })
  modulePage.onShow()
  modulePage.data.groups.forEach((group) => {
    assert(!group.locked, `${module.title} 第 ${group.number} 组应直接开放`)
    group.items.forEach((unit) => {
      modulePage.openLesson({ currentTarget: { dataset: { unitId: unit.id, locked: group.locked } } })
      assert.strictEqual(navigation, `${getLearningPage('lesson', unit)}?moduleId=${module.id}&unitId=${unit.id}`)
    })
    modulePage.openReview({ currentTarget: { dataset: { groupIndex: group.index } } })
    assert.strictEqual(navigation, `${getLearningPage('review', group.items[0])}?moduleId=${module.id}&groupIndex=${group.index}`)
  })
})
assert.deepStrictEqual(saved, { completedIds: { 'hanzi-01': true }, stars: 1, stickerCount: 0, lastModuleId: 'hanzi' }, '自由学习不应写入或覆盖旧进度')
wx.getStorageSync = () => null
modules.forEach((module) => {
  modulePage.onLoad({ moduleId: module.id })
  modulePage.onShow()
  assert.strictEqual(modulePage.data.stars, 0)
  modulePage.data.groups.forEach((group) => {
    assert(!group.locked, '全新用户也应直接访问全部内容')
    assert.strictEqual(group.completed, 0)
  })
})

console.log('学习地图检查通过：四个模块全部开放，458 字、分包路由、提示、音频路径和旧进度均正常。')
