const { getModule } = require('../../data/learning')
const { createReviewLayout, isInsideTarget, snappedPosition } = require('../../utils/review-matching')

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
    const units = module.items.slice(start, start + module.groupSize).slice(0, isHanzi ? 10 : 4)
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const layout = createReviewLayout(units, windowInfo.windowWidth, isHanzi)
    this.layoutMetrics = layout.metrics
    this.dragPositions = {}
    layout.matches.forEach((item) => {
      this.dragPositions[item.id] = { x: item.x, y: item.y }
    })

    this.setData({ module, isHanzi, ...layout })
    wx.setNavigationBarTitle({ title: '拖拽配对' })
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
    const path = `matches[${index}]`
    this.setData({
      [`${path}.x`]: current.x,
      [`${path}.y`]: current.y
    }, () => {
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
  }
  }
}

module.exports = { createReviewPage }
