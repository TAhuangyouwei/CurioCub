const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { createLayout, createSticks, arrangeSticks, dropStick, getSummary } = require('../packages/math-sticks/sticks')

function centerOf(zone, layout) {
  return { x: zone.x + zone.width / 2 - layout.chipWidth / 2, y: zone.y + zone.height / 2 - layout.chipHeight / 2 }
}

function checkArrangement(sticks, layout) {
  assert.strictEqual(new Set(sticks.map((item) => item.id)).size, sticks.length, '不能复制或丢失火柴')
  sticks.forEach((stick, index) => {
    const zone = layout.zones.find((item) => item.id === stick.zone)
    assert(stick.x >= zone.x && stick.y >= zone.y + 30)
    assert(stick.x + layout.chipWidth <= zone.x + zone.width + 0.001)
    assert(stick.y + layout.chipHeight <= zone.y + zone.height)
    sticks.slice(index + 1).forEach((other) => {
      assert(stick.x + layout.chipWidth <= other.x + 0.001 || other.x + layout.chipWidth <= stick.x + 0.001 ||
        stick.y + layout.chipHeight <= other.y || other.y + layout.chipHeight <= stick.y, '火柴触控区域不能重叠')
    })
  })
}

for (const windowWidth of [320, 375, 430, 768]) {
  for (const mode of ['count', 'add', 'subtract']) {
    const layout = createLayout(windowWidth * 694 / 750, mode)
    let sticks = arrangeSticks(createSticks(mode, 10), layout)
    for (const zone of layout.zones) {
      for (let id = 0; id < 10; id += 1) {
        sticks = dropStick(sticks, id, centerOf(zone, layout), layout)
        checkArrangement(sticks, layout)
      }
      assert.strictEqual(getSummary(sticks, mode).counts[zone.id], 10, '每个区域都能放满十根')
    }
    const before = JSON.stringify(sticks)
    sticks = dropStick(sticks, 0, { x: -500, y: -500 }, layout)
    assert.strictEqual(JSON.stringify(sticks), before, '拖出画板应回到原位置')
    const gap = mode === 'add'
      ? { x: layout.zones[0].width + 6 - layout.chipWidth / 2, y: 80 }
      : { x: 40, y: 140 - layout.chipHeight / 2 }
    assert.strictEqual(JSON.stringify(dropStick(sticks, 0, gap, layout)), before, '区域之间的空隙不计数')
  }
}

const addition = createLayout(347, 'add')
for (let a = 0; a <= 10; a += 1) {
  for (let b = 0; b <= 10 - a; b += 1) {
    const sticks = createSticks('add', 5).map((stick, i) => ({ ...stick, zone: i < a ? 'a' : i < a + b ? 'b' : 'pool' }))
    checkArrangement(arrangeSticks(sticks, addition), addition)
    assert.strictEqual(getSummary(sticks, 'add').equation, `${a} + ${b} = ${a + b}`)
  }
}
for (let total = 0; total <= 10; total += 1) {
  for (let removed = 0; removed <= total; removed += 1) {
    const sticks = createSticks('subtract', total).map((stick, i) => ({ ...stick, zone: i < removed ? 'b' : 'a' }))
    assert.strictEqual(getSummary(sticks, 'subtract').equation, `${total} − ${removed} = ${total - removed}`)
  }
}

let definition
let measuredWidth = 347
global.Page = (page) => { definition = page }
global.wx = {
  getWindowInfo() { return { windowWidth: 375 } },
  setStorageSync() { throw new Error('自由摆火柴不能改写学习记录') },
  createSelectorQuery() {
    const query = {
      in() { return query }, select() { return query },
      boundingClientRect(callback) { query.callback = callback; return query },
      exec() { query.callback({ width: measuredWidth }) }
    }
    return query
  }
}
require('../packages/math-sticks/pages/workshop/index')
const page = {
  ...definition,
  data: JSON.parse(JSON.stringify(definition.data)),
  setData(changes) {
    Object.entries(changes).forEach(([key, value]) => {
      const match = key.match(/^sticks\[(\d+)\]\.(x|y)$/)
      if (match) this.data.sticks[Number(match[1])][match[2]] = value
      else this.data[key] = value
    })
  }
}
page.onLoad()
page.onReady()
assert.strictEqual(page.data.equation, '0 根')

// Use a nonzero page offset to reproduce dragging after scrolling. End at a
// different coordinate from the last move, as happens with quick finger lifts.
function drag(id, zoneId, options = {}) {
  const stick = page.sticks.find((item) => item.id === id)
  const currentTarget = { dataset: { id } }
  const origin = { identifier: 7, pageX: 56 + stick.x, pageY: 400 + stick.y }
  page.onDragStart({ currentTarget, touches: [origin] })
  const destination = options.outside ? { x: -200, y: -200 } : centerOf(page.layout.zones.find((item) => item.id === zoneId), page.layout)
  const touch = { identifier: 7, pageX: origin.pageX + destination.x - stick.x, pageY: origin.pageY + destination.y - stick.y }
  page.onDragMove({ currentTarget, touches: [{ ...touch, pageY: origin.pageY }] })
  if (options.cancel) page.onDragCancel({ currentTarget })
  else page.onDragEnd({ currentTarget, changedTouches: [touch] })
  assert.strictEqual(page.data.activeId, -1)
  checkArrangement(page.sticks, page.layout)
  assert.deepStrictEqual(page.data.sticks, page.sticks)
}

drag(0, 'a', { cancel: true })
assert.strictEqual(page.data.equation, '0 根', '触摸取消不能错误计数')
for (let id = 0; id < 10; id += 1) {
  drag(id, 'a')
  assert.strictEqual(page.data.equation, `${id + 1} 根`)
}
drag(0, 'pool', { outside: true })
assert.strictEqual(page.data.equation, '10 根')
drag(0, 'pool')
assert.strictEqual(page.data.equation, '9 根', '拖回收纳盒应减去一根')
page.changeMode({ currentTarget: { dataset: { mode: 'add' } } })
for (let id = 0; id < 2; id += 1) drag(id, 'a')
for (let id = 2; id < 5; id += 1) drag(id, 'b')
assert.strictEqual(page.data.equation, '2 + 3 = 5')
drag(2, 'a')
assert.strictEqual(page.data.equation, '3 + 2 = 5', '两组间移动不能改变总数')
measuredWidth = 694 * 320 / 750
page.onResize()
assert.strictEqual(page.data.equation, '3 + 2 = 5', '屏宽变化不能清空摆放结果')
checkArrangement(page.sticks, page.layout)
page.changeMode({ currentTarget: { dataset: { mode: 'subtract' } } })
drag(0, 'b')
drag(1, 'b')
assert.strictEqual(page.data.equation, '5 − 2 = 3')
drag(0, 'a')
assert.strictEqual(page.data.equation, '5 − 1 = 4', '减法应支持拿走后再放回')
for (let i = 0; i < 6; i += 1) page.changeTotal({ currentTarget: { dataset: { delta: -1 } } })
assert.strictEqual(page.data.startCount, 0)
assert.strictEqual(page.data.equation, '0 − 0 = 0')
for (let i = 0; i < 11; i += 1) page.changeTotal({ currentTarget: { dataset: { delta: 1 } } })
assert.strictEqual(page.data.startCount, 10)
drag(9, 'b')
page.resetBoard()
assert.strictEqual(page.data.equation, '10 − 0 = 10')

const app = require('../app.json')
const subpackage = app.subpackages.find((item) => item.name === 'math-sticks')
assert(subpackage)
for (const extension of ['js', 'json', 'wxml', 'wxss']) {
  assert(fs.existsSync(path.join(__dirname, '..', subpackage.root, subpackage.pages[0] + '.' + extension)))
}
const mapMarkup = fs.readFileSync(path.join(__dirname, '../pages/module/module.wxml'), 'utf8')
assert(!mapMarkup.match(/<button[^>]*class="review-button"[^>]*>/)[0].includes('wx:if'), '复习入口也应随时可见')
require('../pages/module/module')
let route
global.wx.navigateTo = (options) => { route = options.url }
definition.openMathWorkshop()
assert.strictEqual(route, `/${subpackage.root}/${subpackage.pages[0]}`)
console.log('火柴棍检查通过：四种屏宽、全部十以内加减组合、拖动/吸附/取消/重摆/屏宽变化，以及地图入口均正常。')
