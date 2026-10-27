const assert = require('assert')
const { createReviewLayout, snappedPosition, isInsideTarget } = require('../utils/review-matching')
const { getModule } = require('../data/learning')

assert.strictEqual(require('../app.json').resizable, true, '应启用 iPad 可调整窗口')
for (const width of [320, 375, 390, 430, 507, 600, 768, 834, 1024, 1366]) {
  for (const isHanzi of [false, true]) {
    const group = getModule(isHanzi ? 'hanzi' : 'english').items.slice(0, isHanzi ? 10 : 4)
    const layout = createReviewLayout(group, width, isHanzi)
    const scale = Math.min(width / 750, 0.65)
    const boardWidth = width - 120 * scale
    if (!isHanzi) assert(Math.abs(layout.metrics.chipWidth - 150 * scale) < 0.001, '平板拖拽尺寸应与缩放后的样式一致')
    for (const match of layout.matches) {
      const snapped = snappedPosition(match, layout.metrics)
      assert(isInsideTarget(snapped, match, layout.metrics))
      assert(snapped.x >= 0 && snapped.x + layout.metrics.chipWidth <= boardWidth + 0.001)
    }
  }
}

let definition
let width = 375
global.Page = (page) => { definition = page }
global.wx = { getStorageSync() {}, getWindowInfo: () => ({ windowWidth: width }), setNavigationBarTitle() {}, showToast() {} }
require('../pages/review/review')
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)),
  setData(changes, callback) {
    for (const [key, value] of Object.entries(changes)) {
      const nested = key.match(/^(matches|targets)\[(\d+)\]\.(\w+)$/)
      if (nested) this.data[nested[1]][Number(nested[2])][nested[3]] = value
      else this.data[key] = value
    }
    if (callback) callback()
  }
}
page.onLoad({ moduleId: 'hanzi', groupIndex: 0 })
const first = page.data.matches[0]
const event = { currentTarget: { dataset: { id: first.id } } }
page.onDragChange({ ...event, detail: snappedPosition(first, page.layoutMetrics) })
page.onDragEnd(event)
for (const nextWidth of [768, 1024, 507, 375]) {
  width = nextWidth
  page.onResize()
  assert.strictEqual(page.data.completedCount, 1, '横竖屏切换应保留复习结果')
  assert(page.data.matches[0].paired)
  assert(page.data.targets.find((target) => target.id === first.id).paired)
  assert(isInsideTarget(page.dragPositions[first.id], page.data.matches[0], page.layoutMetrics))
}
let pendingCallback
const setData = page.setData
page.setData = function(changes, callback) { setData.call(this, changes); if (callback) pendingCallback = callback }
const second = page.data.matches[1]
const secondEvent = { currentTarget: { dataset: { id: second.id } } }
page.onDragChange({ ...secondEvent, detail: snappedPosition(second, page.layoutMetrics) })
page.onDragEnd(secondEvent)
width = 1024
page.onResize()
pendingCallback()
assert.strictEqual(page.data.completedCount, 1, '旋转前尚未完成的拖拽回调不能写入新布局')
console.log('屏幕适配检查通过：iPhone 比例、平板尺寸上限、十种窗口宽度、拖拽坐标与旋转后配对结果均正常。')
