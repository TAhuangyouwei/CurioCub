const assert = require('assert')
const fs = require('fs')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { guideFor } = require('../packages/hanzi-writing/utils/stroke-guide')
const { createTracePage } = require('../pages/trace/trace-page')
const { saveRange, exitRange, setAutoRead, orderedHanzi } = require('../utils/hanzi-settings')

let definition
let navigation
let reloaded = false
let now = 0
Date.now = () => now
const intervals = new Map()
let timerId = 0
global.setInterval = callback => { intervals.set(++timerId, callback); return timerId }
global.clearInterval = id => intervals.delete(id)
const store = new Map()
const calls = []
const context = Object.fromEntries(['setTransform', 'clearRect', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'stroke', 'quadraticCurveTo', 'bezierCurveTo', 'closePath'].map(name => [name, (...args) => calls.push([name, ...args])]))
const canvas = { getContext: () => context }
let info = { windowWidth: 375, windowHeight: 667, screenHeight: 667, pixelRatio: 3, safeArea: { bottom: 633 } }
let current
const imageRequests = []
global.Page = page => { definition = page }
global.getApp = () => ({ globalData: { audio: { stop() {} } } })
global.wx = {
  getWindowInfo: () => info,
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  navigateTo: options => { navigation = options.url },
  redirectTo: options => { navigation = options.url },
  reLaunch() { reloaded = true },
  loadSubpackage: options => imageRequests.push(options),
  createSelectorQuery() {
    return { in() { return this }, select() { return this }, fields() { return this },
      exec(callback) { callback([{ node: canvas, width: current.data.boardSize, height: current.data.boardSize }]) } }
  }
}
setAutoRead(false)
const traceDefinition = createTracePage(success => success(require('../packages/hanzi-writing/utils/stroke-guide')))
function traceAt(unitId = 'hanzi-01') {
  current = { ...traceDefinition, data: JSON.parse(JSON.stringify(traceDefinition.data)),
    setData(changes, callback) { Object.assign(this.data, changes); if (callback) callback() } }
  current.onLoad({ unitId })
  current.onReady()
  return current
}
function touch(point, page, identifier = 1) { return { x: point[0] / 1000 * page.size, y: point[1] / 1000 * page.size, identifier } }
function write(page, points) {
  page.onTouchStart({ touches: [touch(points[0], page)] })
  points.slice(1, -1).forEach(p => page.onTouchMove({ touches: [touch(p, page)] }))
  page.onTouchEnd({ changedTouches: [touch(points.at(-1), page)] })
}
const units = orderedHanzi()
for (const unit of units) {
  const lesson = createLessonPage()
  Object.assign(lesson, { data: { isHanzi: true, unit } })
  lesson.openTrace()
  assert.strictEqual(navigation, `/packages/hanzi-practice/pages/trace/index?unitId=${unit.id}`)
}
for (const [width, height, bottom, ratio] of [[320, 480, 0, 2], [375, 667, 34, 3], [768, 1024, 20, 2], [1024, 768, 20, 2]]) {
  info = { windowWidth: width, windowHeight: height, screenHeight: height, pixelRatio: ratio, safeArea: { bottom: height - bottom } }
  const page = traceAt()
  assert(page.data.boardSize <= width - 24)
  assert(page.data.boardSize + 280 + page.data.bottomInset <= height, '画板和全部操作应放得下')
  assert.strictEqual(page.data.boardSize, Math.floor(Math.min(width - 24, height - 280 - page.data.bottomInset)))
  assert.strictEqual(canvas.width, Math.round(page.data.boardSize * ratio))
  assert(context.lineWidth >= 8 && context.lineWidth <= 26)
  assert.deepStrictEqual(calls.filter(call => call[0] === 'setTransform').at(-1), ['setTransform', ratio, 0, 0, ratio, 0, 0])
}
let page = traceAt()
const guide = guideFor(page.data.unit.title)
write(page, [...guide.strokes[0].points].reverse())
assert.strictEqual(page.strokes.length, 0, '倒写不得进入下一笔')
assert(page.data.demonstrating, '写错后应自动演示当前笔')
assert(page.data.feedback.includes('没关系'))
write(page, guide.strokes[0].points)
assert.strictEqual(page.strokes.length, 1)
assert.strictEqual(page.data.strokeNumber, 2)
assert.strictEqual(page.strokes[0].length, guide.strokes[0].points.length, '提笔最后位置必须保留')
const accepted = JSON.stringify(page.strokes)
write(page, guide.strokes[2].points)
assert.strictEqual(JSON.stringify(page.strokes), accepted, '跳笔应清掉当前笔，保留已通过笔画')
page.showHint()
assert(page.data.hintVisible)
assert.strictEqual(page.context, null, '打开提示时应释放画布，避免真机笔迹穿透弹窗')
assert.strictEqual(page.data.hintImage, page.data.unit.imageFile)
assert.strictEqual(JSON.stringify(page.strokes), accepted, '查看配图不丢失正确笔迹')
page.closeHint()
assert(page.context, '关闭提示后应重新连接画布并恢复笔迹')
assert.strictEqual(JSON.stringify(page.strokes), accepted)
page.demonstrateAll()
assert(page.data.demonstrating)
now += 1450
for (const tick of intervals.values()) tick()
assert.strictEqual(page.data.strokeNumber, 2, '完整演示必须推进到第二笔')
assert.strictEqual(JSON.stringify(page.strokes), accepted, '演示不能代写或清空孩子的字')
now += 5000
for (const tick of intervals.values()) tick()
assert(!page.data.demonstrating)
assert.strictEqual(page.data.strokeNumber, 2, '演示结束回到未完成的一笔')
page.onTouchStart({ touches: [touch([10, 10], page), touch([20, 20], page, 2)] })
assert(!page.activeStroke, '多点误触不得落笔')
page.onTouchStart({ touches: [touch(guide.strokes[1].points[0], page)] })
page.onTouchEnd({ changedTouches: [touch([20, 20], page, 3)] })
assert(page.activeStroke, '其他触点抬起不能结束这一笔')
page.onTouchMove({ touches: [{ x: -1, y: 20, identifier: 1 }] })
assert.strictEqual(page.activeStroke, null)
assert.strictEqual(JSON.stringify(page.strokes), accepted)
page.onTouchStart({ touches: [touch(guide.strokes[1].points[0], page)] })
page.onTouchCancel()
assert.strictEqual(page.activeStroke, null)
info = { ...info, windowWidth: 768, windowHeight: 1024 }
page.onResize()
assert.strictEqual(JSON.stringify(page.strokes), accepted)
page.undoStroke()
assert.strictEqual(page.strokes.length, 0)
assert.strictEqual(page.data.strokeNumber, 1)
for (const stroke of guide.strokes) write(page, stroke.points)
assert(page.data.complete && page.data.feedback.includes('真棒'))
assert.strictEqual(page.data.unit.id, 'hanzi-01', '完成后不能自动换字')
assert.strictEqual(page.data.guide, null)
write(page, guide.strokes[0].points)
assert.strictEqual(page.strokes.length, guide.count, '完成后不能继续乱涂')
page.undoStroke()
assert(!page.data.complete && page.data.strokeNumber === guide.count)
page.clearWriting()
assert(!page.data.hasInk && page.data.strokeNumber === 1)
assert.strictEqual(store.has('curiocub-progress-v1'), false, '练字不应擅自修改学习进度或奖励')
page.nextCharacter()
assert.strictEqual(page.data.unit.id, 'hanzi-02')
assert.strictEqual(page.strokes.length, 0)
page.previousCharacter()
page.previousCharacter()
assert.strictEqual(page.data.unit.id, 'hanzi-01')
page = traceAt(units.at(-1).id)
page.nextCharacter()
assert.strictEqual(page.data.unit.id, units.at(-1).id)
page.demonstrateAll()
page.onHide()
assert.strictEqual(page.data.demonstrating, false)
assert.strictEqual(page.demoTimer, null)
page.onUnload()
assert.strictEqual(page.context, null)
page = traceAt('invalid')
assert(reloaded)

saveRange(units[39].id, units[40].id)
page = traceAt(units[40].id)
assert.deepStrictEqual(page.units.map(u => u.id), [units[39].id, units[40].id])
assert.strictEqual(page.data.total, 2)
page.nextCharacter()
assert.strictEqual(page.data.unit.id, units[39].id)
page.previousCharacter()
assert.strictEqual(page.data.unit.id, units[40].id)
page.showHint()
assert(page.data.hintLoading)
page.nextCharacter()
imageRequests.shift().success()
assert.strictEqual(page.data.hintImage, '', '旧字提示加载迟到不得覆盖新字')
page.showHint()
assert.strictEqual(page.data.hintImage, units[39].imageFile)
page.closeHint()
page.onSwipeStart({ touches: [{ clientX: 20, clientY: 20 }] })
page.onSwipeEnd({ changedTouches: [{ clientX: 160, clientY: 30 }] })
assert.strictEqual(page.data.unit.id, units[40].id, '画板外可滑动循环换字')
page = traceAt('hanzi-01')
assert.strictEqual(page.data.unit.id, units[39].id)
saveRange(units[0].id, units[0].id)
page = traceAt()
assert(!page.data.hasNext && !page.data.hasPrevious)
page.nextCharacter()
assert.strictEqual(page.data.unit.id, units[0].id)
exitRange()
for (const unit of units) {
  page = traceAt(unit.id)
  for (const stroke of guideFor(unit.title).strokes) write(page, stroke.points)
  assert(page.data.complete, `${unit.title} 的所有笔画应能在页面完整写完`)
  page.onUnload()
  calls.length = 0
}
const template = fs.readFileSync(require.resolve('../packages/hanzi-practice/pages/trace/index.wxml'), 'utf8')
assert(template.includes('catchtouchmove="onTouchMove"'))
assert(template.includes('wx:if="{{!hintVisible}}"'), '提示弹出时不应保留原生画布')
assert(template.includes('type="2d"') && template.includes('bindtap="showHint"') && template.includes('bindtap="demonstrateAll"'))
assert.strictEqual(require('../packages/hanzi-practice/pages/trace/index.json').disableScroll, true)
for (const route of ['../pages/trace/trace', '../packages/hanzi-writing/pages/trace/index']) {
  require(route)
  definition.onLoad({ unitId: 'hanzi-40' })
  assert.strictEqual(navigation, '/packages/hanzi-practice/pages/trace/index?unitId=hanzi-40', '旧入口应兼容转到音频所在分包')
}
console.log('练字页面检查通过：458 字完整书写、逐笔拦截与保留、配图提示、完整演示、撤销/重写、完成停留、屏幕适配、范围双向循环与旧入口。')
