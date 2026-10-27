const { getModule } = require('../../data/learning')
const { createReviewLayout, isInsideTarget, snappedPosition } = require('../../utils/review-matching')
const { playAudio, stopAudio } = require('../../utils/audio')

function createReviewPage() {
  return {
  data: {
    module: null,
    matches: [],
    targets: [],
    boardHeight: 0,
    completedCount: 0,
    allPaired: false,
    isHanzi: false
  },

  onLoad(options) {
    const module = getModule(options.moduleId)
    const groupIndex = Number(options.groupIndex || 0)
    if (!module) {
      wx.navigateBack()
      return
    }

    const start = groupIndex * module.groupSize
    const isHanzi = module.id === 'hanzi'
    this.reviewUnits = module.items.slice(start, start + module.groupSize).slice(0, isHanzi ? 10 : 4)
    this.setData({ module, isHanzi })
    this.updateLayout()
    wx.setNavigationBarTitle({ title: '拖拽配对' })
  },

  updateLayout() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const layout = createReviewLayout(this.reviewUnits, windowInfo.windowWidth, this.data.isHanzi)
    const pairedIds = new Set(this.data.matches.filter((item) => item.paired).map((item) => item.id))
    this.layoutMetrics = layout.metrics
    this.dragPositions = {}
    layout.matches.forEach((item) => {
      if (pairedIds.has(item.id)) Object.assign(item, snappedPosition(item, layout.metrics), { paired: true })
      this.dragPositions[item.id] = { x: item.x, y: item.y }
    })
    layout.targets.forEach((item) => { item.paired = pairedIds.has(item.id) })
    this.setData(layout)
  },

  onResize() {
    if (this.reviewUnits) this.updateLayout()
  },

  playTargetAudio(event) {
    if (!this.data.isHanzi) return
    const unit = this.reviewUnits.find(item => item.id === event.currentTarget.dataset.id)
    if (unit) playAudio(unit.characterAudioFile)
  },

  onDragChange(event) {
    const id = event.currentTarget.dataset.id
    this.dragPositions[id] = { x: event.detail.x, y: event.detail.y }
  },

  onDragEnd(event) {
    const id = event.currentTarget.dataset.id
    const index = this.data.matches.findIndex((item) => item.id === id)
    const match = this.data.matches[index]
    if (!match || match.paired) return

    const current = this.dragPositions[id] || { x: match.startX, y: match.startY }
    const metrics = this.layoutMetrics
    const path = `matches[${index}]`
    this.setData({
      [`${path}.x`]: current.x,
      [`${path}.y`]: current.y
    }, () => {
      if (metrics !== this.layoutMetrics) return
      if (!isInsideTarget(current, match, this.layoutMetrics)) {
        this.setData({
          [`${path}.x`]: match.startX,
          [`${path}.y`]: match.startY
        })
        this.dragPositions[id] = { x: match.startX, y: match.startY }
        wx.showToast({ title: '再看看，它应该去哪里？', icon: 'none' })
        return
      }

      const snapped = snappedPosition(match, this.layoutMetrics)
      const targetIndex = this.data.targets.findIndex((item) => item.id === id)
      const completedCount = this.data.completedCount + 1
      const allPaired = completedCount === this.data.matches.length
      this.dragPositions[id] = snapped
      this.setData({
        [`${path}.x`]: snapped.x,
        [`${path}.y`]: snapped.y,
        [`${path}.paired`]: true,
        [`targets[${targetIndex}].paired`]: true,
        completedCount,
        allPaired
      })
      wx.showToast({ title: allPaired ? '全部配对成功！' : '配对成功！', icon: 'success' })
    })
  },

  backToMap() {
    wx.navigateBack()
  },

  onHide() {
    stopAudio()
  },

  onUnload() {
    stopAudio()
  }
  }
}

module.exports = { createReviewPage }
