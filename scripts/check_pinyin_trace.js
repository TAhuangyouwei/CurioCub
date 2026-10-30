const assert = require('assert')
const { getModule } = require('../data/learning')
const { pointAt } = require('../packages/pinyin-basic-v2/data/writing')
let definition
global.Page = value => { definition = value }
global.wx = { getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }) }
require('../packages/pinyin-basic-v2/pages/trace/index')
const timers = new Map(); let timerId = 0
const set = global.setTimeout, clear = global.clearTimeout
global.setTimeout = callback => { timers.set(++timerId, callback); return timerId }
global.clearTimeout = id => timers.delete(id)
function pageAt(title, width = 343, height = 240) {
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(value) { Object.assign(this.data, value) } }
  page.onLoad({ unitId: getModule('pinyin').items.find(unit => unit.title === title).id })
  page.ctx = { clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {}, fillText() {} }
  page.width = width; page.height = height
  return page
}
function touch(page, point, identifier = 1) {
  const { scale, left, top } = page.transform()
  return { x: left + point[0] * scale, y: top + point[1] * scale, identifier }
}
function write(page, points) {
  page.startInk({ touches: [touch(page, points[0])] })
  points.slice(1, -1).forEach(point => page.moveInk({ touches: [touch(page, point)] }))
  page.endInk({ changedTouches: [touch(page, points.at(-1))] })
}
try {
  let page = pageAt('b')
  const first = page.guide.strokes[0].points
  write(page, first.map(([x, y]) => [x + 28, y]))
  assert.strictEqual(page.ink.length, 0, '明显写偏的笔画必须清掉，不能作为已完成笔迹保留')
  assert.strictEqual(page.data.strokeNumber, 1)
  assert(page.data.feedback && page.data.feedback.includes('再'), '写偏应提示重新描当前笔')
  write(page, [...first].reverse())
  assert.strictEqual(page.ink.length, 0, '倒着写不能通过')
  write(page, page.guide.strokes[1].points)
  assert.strictEqual(page.ink.length, 0, '跳写后面的笔画不能通过')
  write(page, first)
  assert.strictEqual(page.ink.length, 1)
  assert.strictEqual(page.data.strokeNumber, 2, '写对一笔才自动提示下一笔')
  const accepted = JSON.stringify(page.ink)
  write(page, [[30, 20], [50, 100], [5, 10]])
  assert.strictEqual(JSON.stringify(page.ink), accepted, '重描只清除错误笔画，保留已写对的部分')
  page.demonstrate()
  for (let i = 0; timers.size && i < 100; i++) { const [id, tick] = timers.entries().next().value; timers.delete(id); tick() }
  assert.strictEqual(JSON.stringify(page.ink), accepted, '演示不能代写或清空孩子已通过的笔画')
  assert.strictEqual(page.data.strokeNumber, 2)
  write(page, page.guide.strokes[1].points)
  assert(page.data.complete && page.data.feedback.includes('真棒'))
  write(page, first); assert.strictEqual(page.ink.length, 2, '完成后不能继续乱涂')
  page.undoStroke(); assert(!page.data.complete && page.data.strokeNumber === 2)
  page.clearInk(); assert.strictEqual(page.data.strokeNumber, 1)

  for (const { title } of getModule('pinyin').items) for (const size of [[296, 190], [736, 340]]) {
    page = pageAt(title, ...size)
    for (const stroke of page.guide.strokes) {
      const before = page.ink.length
      const sampled = stroke.name === '点' ? [pointAt(stroke.points, 0.5)] : Array.from({ length: 41 }, (_, i) => pointAt(stroke.points, Math.pow(i / 40, 1.7)))
      write(page, sampled.map(([x, y]) => [x + 1.2, y + 0.6]))
      assert.strictEqual(page.ink.length, before + 1, `${title} 的正确轨迹带轻微偏移也应通过`)
    }
    assert(page.data.complete, `${title} 在手机和平板上都应能逐笔写完`)
  }
  page = pageAt('o')
  const circle = page.guide.strokes[0].points
  write(page, [...circle].reverse()); assert.strictEqual(page.ink.length, 0, '闭合圆圈也要检查书写方向')
  write(page, [circle[0], circle.at(-1)]); assert.strictEqual(page.ink.length, 0, '不能只点起止位置代替画圆')
  const spike = circle.slice(); spike.splice(12, 0, [90, 60])
  write(page, spike); assert.strictEqual(page.ink.length, 0, '中途大幅偏离必须重描')
  page = pageAt('ü')
  write(page, page.guide.strokes[0].points); write(page, page.guide.strokes[1].points)
  const dot = page.guide.strokes[2].points[0]
  write(page, page.guide.strokes[3].points); assert.strictEqual(page.ink.length, 2, 'ü 两点不能跳过左点先写右点')
  write(page, [dot]); assert.strictEqual(page.ink.length, 3, '点画可以轻点完成')
  write(page, [page.guide.strokes[3].points[0]]); assert(page.data.complete)
  page = pageAt('n')
  page.startInk({ touches: [touch(page, [14, 40])] }); page.cancelInk()
  assert.strictEqual(page.ink.length, 0, '中断触摸不能计为写完')
  page.startInk({ touches: [touch(page, [14, 40]), touch(page, [30, 50], 2)] })
  assert(!page.activeInk, '多指误触不应落笔')
  page.startInk({ touches: [touch(page, [14, 40])] })
  page.endInk({ changedTouches: [touch(page, [14, 80], 2)] })
  assert(page.activeInk, '其他手指抬起不能结束当前一笔')
  page.onResize(); assert(!page.activeInk && !page.data.demonstrating)
  console.log('拼音逐笔检查通过：偏差/倒写/跳笔/缺笔/涂画重描、正确后推进、63 项手机平板轨迹、点画、演示与触摸中断。')
} finally { global.setTimeout = set; global.clearTimeout = clear }
