const assert = require('assert')
const { createReviewLayout, isInsideTarget, snappedPosition } = require('../utils/review-matching')
const { getModule } = require('../data/learning')

const units = [
  { id: '01', title: '土', phrase: '泥土', icon: '🌱', imageFile: '/assets/images/hanzi/hanzi-01-tu.png' },
  { id: '02', title: '五', phrase: '五颗星', icon: '⭐' },
  { id: '03', title: '中', phrase: '中间', icon: '🎯' },
  { id: '04', title: '上', phrase: '树上', icon: '🌳' }
]

;[375, 430].forEach((width) => {
  const layout = createReviewLayout(units, width)
  assert.strictEqual(layout.matches.length, 4, `${width}px 屏幕应显示 4 个待配对文字`)
  assert.strictEqual(layout.targets.length, 4, `${width}px 屏幕应显示 4 个目标`)
  assert.deepStrictEqual(
    layout.matches.map((item) => item.id).sort(),
    layout.targets.map((item) => item.id).sort(),
    `${width}px 屏幕文字与目标数量应完全匹配`
  )

  layout.matches.forEach((match) => {
    assert(!isInsideTarget({ x: match.startX, y: match.startY }, match, layout.metrics), '初始位置不能误判为成功')
    const snapped = snappedPosition(match, layout.metrics)
    assert(isInsideTarget(snapped, match, layout.metrics), '吸附位置必须位于正确目标内')
    const chipCenterX = snapped.x + layout.metrics.chipWidth / 2
    const targetCenterX = match.targetX + layout.metrics.targetWidth / 2
    const chipCenterY = snapped.y + layout.metrics.chipHeight / 2
    const targetCenterY = match.targetY + layout.metrics.targetHeight / 2
    assert(Math.abs(chipCenterX - targetCenterX) < 0.001, '吸附后横向中心应对齐')
    assert(Math.abs(chipCenterY - targetCenterY) < 0.001, '吸附后纵向中心应对齐')
  })
})

const hanzi = getModule('hanzi')
for (const width of [320, 375, 430]) {
  for (let start = 0; start < hanzi.items.length; start += hanzi.groupSize) {
    const group = hanzi.items.slice(start, start + hanzi.groupSize)
    const layout = createReviewLayout(group, width, true)
    assert.strictEqual(layout.matches.length, group.length)
    assert.strictEqual(layout.targets.length, layout.matches.length)
    assert.strictEqual(new Set(layout.targets.map((target) => target.pinyin)).size, group.length, '一轮内拼音应能唯一对应汉字')
    assert(layout.boardHeight <= 380, '十组配对应采用紧凑布局，避免拖动到屏幕外')
    layout.matches.forEach((match) => {
      const correctTarget = layout.targets.find((target) => target.id === match.id)
      assert.strictEqual(correctTarget.pinyin, group.find((unit) => unit.id === match.id).pinyin)
      assert(!correctTarget.imageFile, '识字复习不再使用图片目标')
      assert(!isInsideTarget({ x: match.startX, y: match.startY }, match, layout.metrics))
      const snapped = snappedPosition(match, layout.metrics)
      assert(isInsideTarget(snapped, match, layout.metrics))
      assert(snapped.x >= 0 && snapped.x + layout.metrics.chipWidth <= width * 630 / 750 + 0.001)
      assert(snapped.y + layout.metrics.chipHeight <= layout.boardHeight)
      layout.targets.filter((target) => target.id !== match.id).forEach((target) => {
        const wrongPosition = {
          x: target.x + (layout.metrics.targetWidth - layout.metrics.chipWidth) / 2,
          y: target.y + (layout.metrics.targetHeight - layout.metrics.chipHeight) / 2
        }
        assert(!isInsideTarget(wrongPosition, match, layout.metrics), '不能把错误拼音判为正确')
      })
    })
  }
}

let definition
const played = []
let stops = 0
const player = {
  stop() { stops++ }, play() { played.push(this.src) },
  onError() {}, offError() {}, onCanplay() {}, offCanplay() {}, onEnded() {}, offEnded() {}
}
global.getApp = () => ({ globalData: { audio: player } })
global.Page = (page) => { definition = page }
global.wx = { getWindowInfo: () => ({ windowWidth: 375 }), setNavigationBarTitle() {}, showToast() {} }
require('../pages/review/review')
for (const groupIndex of [0, 7, 45]) {
  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes, callback) {
      Object.entries(changes).forEach(([key, value]) => {
        const nested = key.match(/^(matches|targets)\[(\d+)\]\.(\w+)$/)
        if (nested) this.data[nested[1]][Number(nested[2])][nested[3]] = value
        else this.data[key] = value
      })
      if (callback) callback()
    }
  }
  page.onLoad({ moduleId: 'hanzi', groupIndex })
  assert.strictEqual(typeof page.playTargetAudio, 'function', '拼音目标需要支持点击听读音')
  const beforeListening = JSON.stringify(page.data)
  for (const target of page.data.targets) {
    page.playTargetAudio({ currentTarget: { dataset: { id: target.id } } })
    const unit = page.reviewUnits.find(unit => unit.id === target.id)
    const expected = unit.characterAudioFile.startsWith('/') ? unit.characterAudioFile : `/assets/audio/${unit.characterAudioFile}`
    assert.strictEqual(played.at(-1), expected, '应读点击的拼音对应汉字，不能按打乱后的下标取声音')
  }
  assert.strictEqual(JSON.stringify(page.data), beforeListening, '听读音不能改变配对进度和位置')
  const beforeInvalid = played.length
  page.playTargetAudio({ currentTarget: { dataset: { id: 'invalid' } } })
  assert.strictEqual(played.length, beforeInvalid)
  const first = page.data.matches[0]
  const event = { currentTarget: { dataset: { id: first.id } } }
  page.onDragChange({ ...event, detail: { x: 0, y: 0 } })
  page.onDragEnd(event)
  assert.strictEqual(page.data.completedCount, 0)
  assert.strictEqual(page.data.matches[0].x, first.startX)
  assert.strictEqual(page.data.matches[0].y, first.startY)
  page.data.matches.forEach((match, index) => {
    const event = { currentTarget: { dataset: { id: match.id } } }
    page.onDragChange({ ...event, detail: snappedPosition(match, page.layoutMetrics) })
    page.onDragEnd(event)
    page.onDragEnd(event)
    assert.strictEqual(page.data.completedCount, index + 1, '连续松手事件不能重复计数')
    assert(page.data.targets.find((target) => target.id === match.id).paired)
    assert.strictEqual(page.data.allPaired, index === page.data.matches.length - 1)
  })
  const pairedTarget = page.data.targets[0]
  page.playTargetAudio({ currentTarget: { dataset: { id: pairedTarget.id } } })
  assert.strictEqual(played.length, beforeInvalid + 1, '配对完成后也应能点拼音听读音')
  const beforeHide = stops
  page.onHide()
  page.onUnload()
  assert.strictEqual(stops, beforeHide + 2, '离开页面时停止读音')
}
console.log('拖拽配对检查通过：拼音点读、主包/分包音频、配对前后播放、离页停止，以及拖动/吸附/进度均正常。')
