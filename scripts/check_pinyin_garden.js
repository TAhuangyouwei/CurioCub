const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getModule, getLearningGroups } = require('../data/learning')
const { initials, standardFinals, wholeSyllables } = require('../data/pinyin-builder')
const { guideFor, pointAt } = require('../packages/pinyin-basic-v2/data/writing')
const moduleData = getModule('pinyin')
assert.strictEqual(moduleData.items.length, 63)
assert.deepStrictEqual(moduleData.items.map(unit => unit.title), [...initials, ...standardFinals, ...wholeSyllables].map(item => item.value))
assert.strictEqual(new Set(moduleData.items.map(unit => unit.id)).size, 63)
for (const [i, title] of [...'aoeiuü', ...'bpmfdt'].entries()) assert.strictEqual(moduleData.items.find(unit => unit.title === title).id, `pinyin-${String(i + 1).padStart(2, '0')}`)
const groups = getLearningGroups(moduleData)
assert.strictEqual(groups.length, 11)
assert.deepStrictEqual(groups.map(group => group.length), [6, 6, 6, 5, 6, 6, 6, 6, 6, 6, 4])
assert(groups.every(group => group.every(unit => unit.category === group[0].category)))
const counts = { a: 2, o: 1, e: 1, i: 2, u: 2, ü: 4, b: 2, p: 2, m: 3, f: 2, d: 2, t: 2,
  n: 2, l: 1, g: 2, k: 3, h: 2, j: 2, q: 2, x: 2, r: 2, z: 1, c: 1, s: 1, y: 2, w: 2 }
for (const unit of moduleData.items) {
  const guide = guideFor(unit.title)
  assert.strictEqual(guide.strokes.length, [...unit.title].reduce((sum, char) => sum + counts[char], 0))
  assert(guide.strokes.every(stroke => stroke.points.length > 1 && stroke.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= guide.width && y >= 0 && y <= 120)))
  assert(fs.statSync(path.join(__dirname, '..', unit.audioFile)).size > 0, `${unit.title} 缺少离线录音`)
  assert.deepStrictEqual(pointAt(guide.strokes[0].points, 0), guide.strokes[0].points[0])
  const end = pointAt(guide.strokes[0].points, 1)
  const expectedEnd = guide.strokes[0].points.at(-1)
  assert(Math.hypot(end[0] - expectedEnd[0], end[1] - expectedEnd[1]) < 0.001)
}
for (const c of 'aoeumnrcsxzw') assert(guideFor(c).position.endsWith('：中格'), `${c} 应只占中格`)
for (const c of 'bdfhtkliü') assert(guideFor(c).position.endsWith('：上中格'))
for (const c of 'gpqy') assert(guideFor(c).position.endsWith('：中下格'))
assert(guideFor('j').position.endsWith('：上中下格'))
assert.strictEqual(guideFor('ü').strokes.slice(2).map(stroke => stroke.name).join(','), '点,点')
assert.deepStrictEqual(guideFor('zhi').strokes.map(stroke => stroke.letter), ['z', 'h', 'h', 'i', 'i'])

const store = new Map(), routes = []
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
let definition
global.Page = page => { definition = page }
const audio = { stop() {}, play() {}, onError() {}, offError() {}, onEnded() {}, offEnded() {}, onCanplay() {}, offCanplay() {} }
global.getApp = () => ({ globalData: { audio } })
global.wx = { getStorageSync: key => clone(store.get(key)), setStorageSync: (key, value) => store.set(key, clone(value)),
  showToast() {}, setNavigationBarTitle() {}, navigateTo: options => routes.push(options.url), redirectTo: options => routes.push(options.url),
  getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }) }
let fontRequests = 0
wx.loadFontFace = options => {
  fontRequests++
  assert.strictEqual(options.family, 'CurioCubPinyinHand')
  assert(options.source.includes('data:font/ttf;base64,'), '书写字体必须随包内置')
  assert.strictEqual(options.desc.weight, '400', '书写字体不能被浏览器伪加粗')
  options.success()
}
const instance = def => ({ ...def, data: clone(def.data), setData(changes, callback) {
  for (const [key, value] of Object.entries(changes)) {
    const match = key.match(/^groups\[(\d+)\]\.collapsed$/)
    if (match) this.data.groups[Number(match[1])].collapsed = value
    else this.data[key] = value
  }
  if (callback) callback()
} })
require('../pages/module/module')
const map = instance(definition)
map.onLoad({ moduleId: 'pinyin' }); map.onShow()
assert.strictEqual(fontRequests, 1)
assert(map.data.isLiteracy && map.data.groups.every(group => group.collapsed))
const event = index => ({ currentTarget: { dataset: { groupIndex: index } } })
map.toggleGroup(event(0)); assert(!map.data.groups[0].collapsed)
map.markGroupLearned(event(0))
assert.strictEqual(fontRequests, 1, '返回或刷新同一页面不应重复注册已加载的字体')
assert.strictEqual(map.data.learnedCount, 6)
const stars = store.get('curiocub-progress-v1').stars
map.markGroupLearned(event(0)); assert.strictEqual(store.get('curiocub-progress-v1').stars, stars)
map.openGroup(event(0)); assert(routes.at(-1).includes('moduleId=pinyin'))

require('./lesson-test-fixture')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { getProgress } = require('../utils/progress')
for (const unit of moduleData.items) {
  const lesson = instance(createLessonPage())
  lesson.onLoad({ moduleId: 'pinyin', unitId: unit.id })
  assert(lesson.data.isPinyin && lesson.data.isLiteracy && !lesson.data.isHanzi)
  assert.strictEqual(lesson.lessonItems.length, 63)
  const group = groups.find(group => group.some(item => item.id === unit.id))
  assert.strictEqual(lesson.data.cardTotal, group.length)
  assert.strictEqual(lesson.data.currentNumber, group.findIndex(item => item.id === unit.id) + 1)
  lesson.openTrace(); assert(routes.at(-1).startsWith('/packages/pinyin-basic-v2/pages/trace/index?unitId='))
  lesson.markUnlearned(); assert(getProgress().unlearnedIds[unit.id])
  lesson.markLearned(); assert(getProgress().completedIds[unit.id] && !getProgress().unlearnedIds[unit.id])
  const rewarded = getProgress().stars
  lesson.markUnlearned(); lesson.markLearned(); assert.strictEqual(getProgress().stars, rewarded)
  lesson.markUnstudied(); assert(!getProgress().completedIds[unit.id] && !getProgress().unlearnedIds[unit.id])
}

const { markUnitUnlearned } = require('../utils/progress')
const notebookUnits = moduleData.items.slice(0, 4)
notebookUnits.forEach(unit => markUnitUnlearned(unit.id, 'pinyin'))
markUnitUnlearned('hanzi-01', 'hanzi')
require('../pages/notebook/notebook')
const notebook = instance(definition)
notebook.onLoad({ moduleId: 'pinyin' }); notebook.onShow()
assert.deepStrictEqual(notebook.data.items.map(unit => unit.id), notebookUnits.map(unit => unit.id))
notebook.openLesson({ currentTarget: { dataset: { unitId: notebookUnits[0].id } } })
assert(routes.at(-1).endsWith('&source=notebook'))
const notebookLesson = instance(createLessonPage())
notebookLesson.onLoad({ moduleId: 'pinyin', unitId: notebookUnits[0].id, source: 'notebook' })
assert(notebookLesson.data.isNotebook && notebookLesson.data.swiperCircular)
assert.strictEqual(notebookLesson.data.cardTotal, 4)

const { createReviewPage } = require('../pages/review/review-page')
for (const [index, group] of groups.entries()) {
  const review = instance(createReviewPage())
  review.onLoad({ moduleId: 'pinyin', groupIndex: index })
  assert.deepStrictEqual(review.reviewUnits.map(unit => unit.id), group.map(unit => unit.id))
  assert.strictEqual(review.data.matches.length, group.length)
  review.playTargetAudio({ currentTarget: { dataset: { id: group[0].id } } })
  assert.strictEqual(audio.src, group[0].audioFile)
}

require('../packages/pinyin-basic-v2/pages/trace/index')
const traceDefinition = definition
for (const unit of moduleData.items) {
  const page = instance(traceDefinition)
  page.onLoad({ unitId: unit.id })
  assert.strictEqual(page.data.strokeCount, guideFor(unit.title).strokes.length)
  assert.strictEqual(page.data.strokeNumber, 1)
  // Exercise the actual drawing routine with a canvas-shaped context.
  let lines = 0, labels = 0
  page.ctx = { clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() { lines++ }, stroke() {}, arc() {}, fill() {}, fillText() { labels++ } }
  page.width = 343; page.height = 240
  page.redraw(); assert(lines >= 4 && labels === 1)
  page.startInk({ touches: [{ x: 120, y: 90, identifier: 1 }] })
  assert(page.data.hasInk && page.activeInk)
  page.cancelInk(); assert(!page.activeInk && page.ink.length === 0)
  page.clearInk(); assert(!page.data.hasInk)
  page.onHide(); assert(!page.data.demonstrating)
}
const demo = instance(traceDefinition)
demo.onLoad({ unitId: moduleData.items.find(unit => unit.title === 'ying').id })
demo.ctx = { clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {}, fillText() {} }
demo.width = 343; demo.height = 240
const realSetTimeout = global.setTimeout, realClearTimeout = global.clearTimeout
const timers = new Map(); let timerId = 0, ticks = 0
try {
  global.setTimeout = callback => { timers.set(++timerId, callback); return timerId }
  global.clearTimeout = id => timers.delete(id)
  demo.demonstrate()
  while (timers.size && ticks++ < 500) { const [id, callback] = timers.entries().next().value; timers.delete(id); callback() }
  assert(!demo.data.demonstrating && demo.data.strokeNumber === 1 && demo.ink.length === 0, '只演示当前笔，演示不能推进练习')
  demo.demonstrate(); assert(demo.data.demonstrating)
  demo.onHide(); assert(!demo.data.demonstrating && timers.size === 0, '离开页面必须取消动画')
} finally { global.setTimeout = realSetTimeout; global.clearTimeout = realClearTimeout }
console.log('拼音花园检查通过：63 项、11 站、旧编号、三态/奖励、逐项临摹入口、全部笔顺/占格、画布与书写。')
