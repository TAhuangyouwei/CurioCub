const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getProgress, completeUnit, markUnitUnlearned, getModuleCompletion } = require('../utils/progress')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')

let stored = { completedIds: { 'hanzi-01': true, 'math-01': true }, stars: 4, stickerCount: 1, lastModuleId: 'math' }
let navigation
global.getApp = () => ({ globalData: { audio: { stop() {} }, lessonRequest: null } })
global.wx = {
  getStorageSync: (key) => key === 'curiocub-hanzi-settings-v1' ? { autoRead: false } : stored && JSON.parse(JSON.stringify(stored)),
  setStorageSync(key, value) { stored = JSON.parse(JSON.stringify(value)) },
  removeStorageSync() { stored = null },
  navigateTo(options) { navigation = options.url },
  redirectTo(options) { navigation = options.url },
  navigateBack(options) { options.fail() },
  showToast() {},
  setNavigationBarTitle() {}
}

assert.strictEqual(typeof markUnitUnlearned, 'function', '需要保存未学会状态')
markUnitUnlearned('hanzi-01', 'hanzi')
assert(!stored.completedIds['hanzi-01'], '已学会的字应能改为未学会')
assert(stored.unlearnedIds['hanzi-01'])
assert(stored.completedIds['math-01'], '不能影响其他模块')
assert.strictEqual(stored.stars, 4, '保留已获得的星星')
assert.strictEqual(stored.stickerCount, 1, '保留已获得的贴纸')
assert.strictEqual(getModuleCompletion(getModule('hanzi').items), 0)
completeUnit('hanzi-01', 'hanzi')
assert(stored.completedIds['hanzi-01'])
assert(!stored.unlearnedIds['hanzi-01'], '学会后应移出生字本')
assert.strictEqual(stored.stars, 4, '旧进度迁移后重新学会不能重复奖励')
markUnitUnlearned('hanzi-02', 'hanzi')
completeUnit('hanzi-02', 'hanzi')
assert.strictEqual(stored.stars, 5, '第一次学会仍有奖励')
markUnitUnlearned('hanzi-02', 'hanzi')
completeUnit('hanzi-02', 'hanzi')
assert.strictEqual(stored.stars, 5, '反复切换不能重复奖励')

function lessonAt(moduleId, unitId, source) {
  const definition = createLessonPage()
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
  page.onLoad({ moduleId, unitId, source })
  return page
}

const lesson = lessonAt('hanzi', 'hanzi-01')
lesson.showHint({ currentTarget: { dataset: { unitId: 'hanzi-02' } } })
assert(stored.completedIds['hanzi-01'], '相邻卡片的提示不能改变当前字')
lesson.showHint({ currentTarget: { dataset: { unitId: 'hanzi-01' } } })
assert(lesson.data.hintVisible)
assert(lesson.data.completed, '查看提示保留已学会状态')
assert(!lesson.data.unlearned)
lesson.markUnlearned()
assert(lesson.data.unlearned)
assert(!lesson.data.completed)
assert(stored.unlearnedIds['hanzi-01'], '主动标记未学会后保存')
const reopened = lessonAt('hanzi', 'hanzi-01')
assert(reopened.data.unlearned, '重新进入后状态应保留')
reopened.markLearned()
assert(!reopened.data.unlearned)
assert(!stored.unlearnedIds['hanzi-01'])
assert.strictEqual(stored.stars, 5)
lesson.setCurrentCard(40)
lesson.markUnlearned()
assert(stored.unlearnedIds['hanzi-41'], '分包内汉字也能标记')
lesson.markUnlearned()
assert.strictEqual(Object.keys(stored.unlearnedIds).length, 1, '重复标记不重复收录')
lesson.setCurrentCard(1)
assert(!lesson.data.unlearned, '切换卡片应刷新状态')
const other = lessonAt('math', 'math-01')
const before = JSON.stringify(stored)
other.markUnlearned()
other.showHint({ currentTarget: { dataset: { unitId: 'math-01' } } })
assert.strictEqual(JSON.stringify(stored), before, '该功能只用于识字')

let definition
global.Page = (page) => { definition = page }
function loadPage(file) {
  require(file)
  return { ...definition, data: {}, setData(changes) { Object.assign(this.data, changes) } }
}
const modulePage = loadPage('../pages/module/module')
modulePage.onLoad({ moduleId: 'hanzi' })
modulePage.onShow()
assert.strictEqual(modulePage.data.unlearnedCount, 1)
assert(modulePage.data.groups[4].items[0].unlearned)
modulePage.openNotebook()
assert.strictEqual(navigation, '/pages/notebook/notebook')
const notebook = loadPage('../pages/notebook/notebook')
notebook.onShow()
assert.deepStrictEqual(notebook.data.items.map((unit) => unit.id), ['hanzi-41'], '未标记的字不能进入生字本')
notebook.openLesson({ currentTarget: { dataset: { unitId: 'hanzi-41' } } })
assert.strictEqual(navigation, '/packages/hanzi-extra/pages/lesson/index?moduleId=hanzi&unitId=hanzi-41&source=notebook')
markUnitUnlearned('hanzi-01', 'hanzi')
notebook.onShow()
assert.deepStrictEqual(notebook.data.items.map((unit) => unit.id), ['hanzi-01', 'hanzi-41'])
notebook.openLesson({ currentTarget: { dataset: { unitId: 'hanzi-01' } } })
assert.strictEqual(navigation, '/pages/lesson/lesson?moduleId=hanzi&unitId=hanzi-01&source=notebook')
completeUnit('hanzi-01', 'hanzi')
completeUnit('hanzi-41', 'hanzi')
notebook.onShow()
assert.strictEqual(notebook.data.items.length, 0, '返回生字本应移除已经学会的字')
stored = null
assert.deepStrictEqual(getProgress().unlearnedIds, {})
notebook.onShow()
assert.strictEqual(notebook.data.items.length, 0)
const config = require('../app.json')
assert(config.pages.includes('pages/notebook/notebook'), '生字本页面必须注册')
const template = fs.readFileSync(path.join(__dirname, '../pages/lesson/lesson.wxml'), 'utf8')
assert(template.includes('bindtap="markUnlearned"'), '学习页必须提供未学会按钮')
const learnedButton = template.match(/<button\b[^>]*bindtap="markLearned"[^>]*>[\s\S]*?<\/button>/)[0]
function renderLearnedButton(data) {
  return learnedButton.replace(/\{\{([\s\S]*?)\}\}/g, (_, expression) => (
    Function(...Object.keys(data), `return (${expression})`)(...Object.values(data))
  ))
}

for (const unitId of ['hanzi-01', 'hanzi-41']) {
  stored = { completedIds: { [unitId]: true }, stars: 1, stickerCount: 0, lastModuleId: 'hanzi' }
  const current = lessonAt('hanzi', unitId)
  assert(current.data.completed)
  current.showHint({ currentTarget: { dataset: { unitId } } })
  current.onShow()
  assert.strictEqual(current.data.completed, true, '提示不影响当前页已学会标记')
  assert.strictEqual(current.data.unlearned, false)
  notebook.onShow()
  assert.strictEqual(notebook.data.items.length, 0, '查看提示不能收进生字本')
  current.markUnlearned()
  const afterUnlearnedButton = renderLearnedButton(current.data)
  assert(afterUnlearnedButton.includes('>已学会</button>'))
  assert(!afterUnlearnedButton.includes('selected'), '未学会时已学会按钮不能显示选中')
  modulePage.onShow()
  const mapUnit = modulePage.data.groups.flatMap((group) => group.items).find((unit) => unit.id === unitId)
  assert.strictEqual(mapUnit.completed, false, '主动改为未学会后地图同步更新')
  notebook.onShow()
  assert.deepStrictEqual(notebook.data.items.map((unit) => unit.id), [unitId])
  current.markLearned()
  current.onShow()
  assert.strictEqual(current.data.completed, true, '同一页再次点已学会后恢复标记')
  assert.strictEqual(current.data.unlearned, false)
  const afterLearnedButton = renderLearnedButton(current.data)
  assert(afterLearnedButton.includes('>已学会 ✓</button>'))
  assert(afterLearnedButton.includes('selected'), '重新学会后恢复选中样式')
  notebook.onShow()
  assert.strictEqual(notebook.data.items.length, 0, '同一页重新学会后立即从生字本移除')
  modulePage.onShow()
  const learnedUnit = modulePage.data.groups.flatMap((group) => group.items).find((unit) => unit.id === unitId)
  assert.strictEqual(learnedUnit.completed, true)
  assert.strictEqual(learnedUnit.unlearned, false)
  assert.strictEqual(stored.stars, 1, '重新学会不会重复奖励')
}
// Use scattered letters across stations and resource packages to reproduce notebook swipes.
stored = null
const notebookIds = ['hanzi-01', 'hanzi-10', 'hanzi-41', 'hanzi-302', 'hanzi-458']
notebookIds.forEach((id) => markUnitUnlearned(id, 'hanzi'))
notebook.onShow()
assert.deepStrictEqual(notebook.data.items.map((unit) => unit.id), notebookIds)
let notebookLesson = lessonAt('hanzi', 'hanzi-10', 'notebook')
assert.deepStrictEqual(notebookLesson.lessonItems.map((unit) => unit.id), notebookIds, '只能滑动生字本实际收录的字')
assert.strictEqual(notebookLesson.data.currentNumber, 2)
assert.strictEqual(notebookLesson.data.cardTotal, notebookIds.length)
notebookLesson.onCardChange({ detail: { current: 0 } })
assert.strictEqual(notebookLesson.data.unit.id, 'hanzi-01', '反向滑动也应按生字本顺序')
for (let index = 1; index < notebookIds.length; index++) {
  navigation = null
  notebookLesson.onCardChange({ detail: { current: index } })
  if (navigation) {
    const url = new URL(navigation, 'https://test.local')
    assert.strictEqual(url.searchParams.get('source'), 'notebook', '跨分包跳转必须保留生字本模式')
    assert.strictEqual(url.searchParams.get('unitId'), notebookIds[index])
    notebookLesson = lessonAt('hanzi', notebookIds[index], url.searchParams.get('source'))
  }
  assert.strictEqual(notebookLesson.data.unit.id, notebookIds[index])
  assert.strictEqual(notebookLesson.data.currentNumber, index + 1)
  assert.strictEqual(notebookLesson.data.cardTotal, notebookIds.length)
}
for (let index = notebookIds.length - 2; index >= 0; index--) {
  navigation = null
  notebookLesson.onCardChange({ detail: { current: index } })
  if (navigation) {
    const url = new URL(navigation, 'https://test.local')
    assert.strictEqual(url.searchParams.get('source'), 'notebook')
    notebookLesson = lessonAt('hanzi', url.searchParams.get('unitId'), url.searchParams.get('source'))
  }
  assert.strictEqual(notebookLesson.data.unit.id, notebookIds[index], '跨分包反向滑动不能回到原分站')
}
notebookLesson.returnToModule()
assert.strictEqual(navigation, '/pages/notebook/notebook', '无法原路返回时也应回到生字本')
notebookLesson = lessonAt('hanzi', 'hanzi-458', 'notebook')
notebookLesson.markLearned()
notebook.onShow()
assert.deepStrictEqual(notebook.data.items.map((unit) => unit.id), notebookIds.slice(0, -1))
assert.strictEqual(lessonAt('hanzi', 'hanzi-01', 'notebook').lessonItems.length, 4, '重新查看应使用更新后的生字本')
assert.strictEqual(lessonAt('hanzi', 'hanzi-01').lessonItems.length, getModule('hanzi').items.length, '普通识字入口保持原顺序')
notebookIds.forEach((id) => completeUnit(id, 'hanzi'))
navigation = null
const emptyLesson = lessonAt('hanzi', 'hanzi-01', 'notebook')
assert.strictEqual(navigation, '/pages/notebook/notebook', '生字本为空时不能退回全部汉字')
assert.strictEqual(emptyLesson.data.unit, null)
getModule('hanzi').items.slice(0, 13).forEach((unit) => markUnitUnlearned(unit.id, 'hanzi'))
const longNotebook = lessonAt('hanzi', 'hanzi-13', 'notebook')
assert.strictEqual(longNotebook.data.currentNumber, 13, '生字本计数不能按每站十字重置')
assert.strictEqual(longNotebook.data.cardTotal, 13)
longNotebook.onCardChange({ detail: { current: 0 } })
assert.strictEqual(longNotebook.data.unit.id, 'hanzi-01')
assert.strictEqual(longNotebook.data.currentNumber, 1)
console.log('生字本检查通过：实际字列表、双向滑动、跨分包续看、列表计数、学会移除、空列表和旧进度均正常。')
