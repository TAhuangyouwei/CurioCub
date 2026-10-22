const { getModule } = require('../../data/learning')
const { getProgress } = require('../../utils/progress')

Page({
  data: {
    stars: 0,
    newSticker: false,
    isLast: false
  },

  onLoad(options) {
    this.moduleId = options.moduleId
    this.unitId = options.unitId
    const module = getModule(this.moduleId)
    const unitIndex = module ? module.items.findIndex((item) => item.id === this.unitId) : -1
    const progress = getProgress()
    const isGroupLast = unitIndex === -1 || (unitIndex + 1) % module.groupSize === 0 || unitIndex === module.items.length - 1
    this.setData({
      stars: progress.stars,
      newSticker: options.newSticker === '1',
      isLast: isGroupLast
    })
    wx.setNavigationBarTitle({ title: '收获星星' })
  },

  continueLearning() {
    const module = getModule(this.moduleId)
    const currentIndex = module.items.findIndex((item) => item.id === this.unitId)
    const next = module.items[currentIndex + 1]
    const atGroupEnd = !next || (currentIndex + 1) % module.groupSize === 0
    getApp().globalData.lessonRequest = atGroupEnd
      ? { moduleId: this.moduleId, returnToMap: true }
      : { moduleId: this.moduleId, unitId: next.id }
    wx.navigateBack()
  },

  openStickers() {
    wx.navigateTo({ url: '/pages/stickers/stickers' })
  },

  backToMap() {
    getApp().globalData.lessonRequest = { moduleId: this.moduleId, returnToMap: true }
    wx.navigateBack()
  }
})
