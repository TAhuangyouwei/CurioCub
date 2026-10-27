const assert = require('assert')
const { createQuestion, createLayout, arrangeStars, dropStar, slotPosition } = require('../packages/math-sticks/utils/number-bonds')

function stars(limit) { return Array.from({ length: limit }, (_, id) => ({ id, zone: 'tray' })) }
function center(zone) { return { x: zone.x + zone.width / 2 - 22, y: zone.y + zone.height / 2 - 22 } }
for (const limit of [5, 10]) {
  for (let round = 0; round < 100; round++) {
    const q = createQuestion(limit)
    assert(q.target >= 1 && q.target <= limit)
    assert(q.initialCount >= 0 && q.initialCount < q.target, '每题至少需要补一颗星')
  }
  for (const width of [288, 343, 560]) {
    const layout = createLayout(width, limit)
    for (let initial = 0; initial < limit; initial++) {
      let pieces = arrangeStars(stars(limit), layout, initial)
      for (let id = 0; id < limit; id++) pieces = dropStar(pieces, id, center(layout.basket), layout, initial)
      assert.strictEqual(initial + pieces.filter(s => s.zone === 'basket').length, limit, '篮子最多容纳当前范围内的星星')
      const occupied = [
        ...Array.from({ length: initial }, (_, i) => slotPosition(i, layout.basket, layout)),
        ...pieces.filter(s => s.zone === 'basket')
      ]
      assert.strictEqual(new Set(occupied.map(p => `${p.x}:${p.y}`)).size, limit, '已有星星与补入星星不能重叠')
      for (const piece of pieces) {
        const zone = layout[piece.zone]
        assert(piece.x >= 0 && piece.x + 44 <= width + 0.001)
        assert(piece.y >= zone.y && piece.y + 44 <= zone.y + zone.height)
      }
      pieces = dropStar(pieces, 0, center(layout.tray), layout, initial)
      assert.strictEqual(pieces[0].zone, 'tray', '补入的星星可以拖回')
      const before = JSON.stringify(pieces)
      pieces = dropStar(pieces, 0, { x: -200, y: -200 }, layout, initial)
      assert.strictEqual(JSON.stringify(pieces), before, '拖到区域外应归位')
      assert.strictEqual(pieces.length, limit)
    }
  }
}

let definition
let measuredWidth = 343
let navigation
global.Page = page => { definition = page }
global.wx = {
  getWindowInfo: () => ({ windowWidth: measuredWidth + 32 }),
  getStorageSync: () => null,
  setStorageSync() { throw new Error('分合小游戏不能覆盖原有学习记录') },
  setNavigationBarTitle() {},
  navigateTo: options => { navigation = options.url },
  createSelectorQuery() {
    return { in() { return this }, select() { return this }, boundingClientRect(callback) { this.callback = callback; return this }, exec() { this.callback({ width: measuredWidth }) } }
  }
}
require('../packages/math-sticks/pages/bonds/index')
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) {
  for (const [key, value] of Object.entries(changes)) {
    const nested = key.match(/^stars\[(\d+)\]\.(x|y)$/)
    if (nested) this.data.stars[Number(nested[1])][nested[2]] = value
    else this.data[key] = value
  }
} }
page.onLoad()
page.onReady()
page.setData({ target: 3, initialCount: 1 })
page.resetBoard()
function drag(id, zone) {
  const star = page.stars.find(s => s.id === id)
  const event = { currentTarget: { dataset: { id } } }
  const touch = { pageX: star.x + 22, pageY: star.y + 22, identifier: 1 }
  page.onDragStart({ ...event, touches: [touch] })
  const destination = center(page.layout[zone])
  const end = { pageX: destination.x + 22, pageY: destination.y + 22, identifier: 1 }
  page.onDragMove({ ...event, touches: [end] })
  page.onDragEnd({ ...event, changedTouches: [end] })
}
drag(0, 'basket')
assert(!page.data.complete && page.data.basketCount === 2)
assert.strictEqual(page.data.equation, '', '没有补齐前不提前显示答案')
drag(1, 'basket')
assert(page.data.complete)
assert.strictEqual(page.data.equation, '1 + 2 = 3')
const beforeResize = page.data.equation
measuredWidth = 560
page.onResize()
assert.strictEqual(page.data.equation, beforeResize)
drag(2, 'basket')
assert(!page.data.complete && page.data.feedback.includes('多'))
drag(2, 'tray')
assert(page.data.complete)
page.nextQuestion()
assert(!page.data.complete && page.data.addedCount === 0)
page.changeLimit({ currentTarget: { dataset: { limit: 10 } } })
assert.strictEqual(page.data.stars.length, 10)
assert(page.data.target <= 10 && page.data.initialCount < page.data.target)
const first = page.stars[0]
const event = { currentTarget: { dataset: { id: first.id } }, touches: [{ pageX: first.x, pageY: first.y, identifier: 1 }] }
page.onDragStart(event)
page.onDragMove({ ...event, touches: [...event.touches, { pageX: 10, pageY: 10, identifier: 2 }] })
assert.strictEqual(page.drag, null, '多指误触应取消拖动')
page.onDragStart(event)
page.onHide()
assert.strictEqual(page.drag, null)
assert.strictEqual(page.data.addedCount, 0)
page.onUnload()

require('../pages/module/module')
definition.openNumberBonds()
assert.strictEqual(navigation, '/packages/math-sticks/pages/bonds/index')
assert(require('../app.json').subpackages.find(p => p.name === 'math-sticks').pages.includes('pages/bonds/index'))
console.log('数的分合检查通过：5/10以内题目、拖入/拖回、超量/取消、星星不丢失不重叠、补齐算式、换题、改范围与尺寸变化。')
