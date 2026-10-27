const assert = require('assert')
const fs = require('fs')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')

let definition
let navigation
let reloaded = false
const calls = []
const context = Object.fromEntries(['setTransform', 'clearRect', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'stroke'].map((name) =>
  [name, (...args) => calls.push([name, ...args])]))
const canvas = { getContext: () => context }
let info = { windowWidth: 375, windowHeight: 667, screenHeight: 667, pixelRatio: 3, safeArea: { bottom: 633 } }
global.Page = (page) => { definition = page }
global.getApp = () => ({ globalData: { audio: { stop() {} } } })
global.wx = {
  getWindowInfo: () => info,
  getStorageSync: () => null,
  setStorageSync() { throw new Error('临摹不得修改学习记录') },
  navigateTo: (options) => { navigation = options.url },
  reLaunch() { reloaded = true },
  createSelectorQuery() {
    return { in() { return this }, select() { return this }, fields() { return this },
      exec(callback) { callback([{ node: canvas, width: current.data.boardSize, height: current.data.boardSize }]) } }
  }
}
require('../packages/hanzi-practice/pages/trace/index')
let current
function traceAt(unitId = 'hanzi-01') {
  current = { ...definition, data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes, callback) { Object.assign(this.data, changes); if (callback) callback() } }
  current.onLoad({ unitId })
  current.onReady()
  return current
}
function touch(x, y, identifier = 1) { return { x, y, identifier } }
function event(points, field = 'touches') { return { [field]: points } }

const units = getModule('hanzi').items
for (const unit of units) {
  const lesson = createLessonPage()
  Object.assign(lesson, { data: { isHanzi: true, unit } })
  lesson.openTrace()
  assert.strictEqual(navigation, `/packages/hanzi-practice/pages/trace/index?unitId=${unit.id}`, '主包和分包均可直接临摹当前汉字')
}
for (const [width, height, bottom, ratio] of [[320, 480, 0, 2], [375, 667, 34, 3], [768, 1024, 20, 2], [1024, 768, 20, 2]]) {
  info = { windowWidth: width, windowHeight: height, screenHeight: height, pixelRatio: ratio, safeArea: { bottom: height - bottom } }
  const page = traceAt()
  assert(page.data.boardSize <= width - 24)
  assert(page.data.boardSize + 218 + page.data.bottomInset <= height, '画板与操作区不能超出屏幕')
  assert(page.data.boardSize >= Math.min(width - 24, height - 252), '画板应尽量放大')
  assert.strictEqual(canvas.width, Math.round(page.data.boardSize * ratio), '高清屏应按像素比绘制')
  assert(context.lineWidth >= 8, '小屏幕的手写笔迹也要足够粗，便于手指临摹')
  assert(context.lineWidth >= Math.max(5, page.data.boardSize * 0.022) * 1.4, '默认笔迹应明显加粗')
  assert(context.lineWidth <= 26, '平板上的笔迹不能过粗而遮住复杂笔画')
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'setTransform').at(-1), ['setTransform', ratio, 0, 0, ratio, 0, 0])
}
let page = traceAt()
calls.length = 0
page.onTouchStart(event([touch(20, 30)]))
assert(calls.some((call) => call[0] === 'arc'), '点一下也应留下笔迹')
page.onTouchMove(event([touch(60, 90)]))
page.onTouchEnd(event([touch(80, 100)], 'changedTouches'))
assert.strictEqual(page.strokes.length, 1)
assert.strictEqual(page.strokes[0].length, 3, '提笔前最后一个位置不能丢失')
assert(calls.some((call) => call[0] === 'lineTo' && Math.abs(call[1] - 80) < 0.000001 && Math.abs(call[2] - 100) < 0.000001))
page.onTouchStart(event([touch(150, 160)]))
page.onTouchEnd(event([touch(150, 160)], 'changedTouches'))
assert.strictEqual(page.strokes.length, 2, '抬笔后新一笔不能连接上一笔')
page.undoStroke()
assert.strictEqual(page.strokes.length, 1)
assert(page.data.hasInk)

const savedStroke = JSON.stringify(page.strokes)
page.demonstrateFirstStroke()
assert(page.data.demonstrating, '首笔演示应可以开始')
assert.strictEqual(JSON.stringify(page.strokes), savedStroke, '首笔演示不能删除孩子的笔迹')
page.onHide()
assert.strictEqual(page.data.demonstrating, false, '切到后台应停止演示')
assert.strictEqual(page.demoTimer, null)
info = { ...info, windowWidth: 768, windowHeight: 1024 }
page.onResize()
assert.strictEqual(JSON.stringify(page.strokes), savedStroke, '改变尺寸应保留按比例存储的笔迹')
page.onTouchStart(event([touch(30, 40), touch(70, 80, 2)]))
assert.strictEqual(page.strokes.length, 1, '多点误触不应新建一笔')
page.onTouchStart(event([touch(30, 40, 2)]))
page.onTouchEnd(event([touch(80, 90, 3)], 'changedTouches'))
assert(page.activeStroke, '其他触点抬起不能结束当前笔')
page.onTouchMove(event([touch(-1, 90, 2)]))
assert.strictEqual(page.activeStroke, null, '划出画板应停止落笔')
page.onTouchStart(event([touch(10, 10)]))
page.onTouchCancel()
assert.strictEqual(page.activeStroke, null)
page.onTouchStart(event([touch(15, 15)]))
page.onHide()
assert.strictEqual(page.activeStroke, null, '切到后台应提笔')
page.clearWriting()
assert.strictEqual(page.strokes.length, 0)
assert.strictEqual(page.data.hasInk, false)

page.onTouchStart(event([touch(20, 20)]))
page.nextCharacter()
assert.strictEqual(page.data.unit.id, 'hanzi-02')
assert.strictEqual(page.strokes.length, 0, '换字不应遗留旧笔迹')
page.previousCharacter()
page.previousCharacter()
assert.strictEqual(page.data.unit.id, 'hanzi-01')
page = traceAt(units.at(-1).id)
page.nextCharacter()
assert.strictEqual(page.data.unit.id, units.at(-1).id)
page.onUnload()
assert.strictEqual(page.context, null)
page = { ...definition, data: {}, setData() {} }
page.onLoad({ unitId: 'invalid' })
assert(reloaded)

const pages = require('../app.json').pages
assert(pages.includes('pages/trace/trace'))
assert.strictEqual(new Set(pages).size, pages.length, '页面注册不能重复')
const template = fs.readFileSync(require.resolve('../packages/hanzi-practice/pages/trace/index.wxml'), 'utf8')
assert(template.includes('catchtouchmove="onTouchMove"'))
assert(template.includes('type="2d"'))
assert.strictEqual(require('../packages/hanzi-practice/pages/trace/index.json').disableScroll, true)
console.log('临摹检查通过：458 字入口、手机/iPad 画板尺寸、高清绘制、点画/连画/提笔、撤销/重写、多点误触、取消/后台、换字和尺寸变化均正常。')
