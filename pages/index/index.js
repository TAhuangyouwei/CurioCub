const { modules } = require('../../data/learning')
const { getProgress, getModuleCompletion } = require('../../utils/progress')
const stickers = require('../../data/stickers')

Page({
  data: {
    stars: 0,
    stickers: 0,
    stickerTotal: stickers.length,
    modules: [],
    continueModuleId: 'hanzi'
  },

  onShow() {
    const progress = getProgress()
    const moduleCards = modules.map((module) => {
      const progressItems = module.id === 'math' ? module.items.slice(0, 10) : module.items
      const completed = getModuleCompletion(progressItems)
      return {
        ...module,
        completed,
        total: progressItems.length,
        percent: Math.round((completed / progressItems.length) * 100)
      }
    })

    this.setData({
      stars: progress.stars,
      stickers: progress.stickerCount,
      modules: moduleCards,
      continueModuleId: progress.lastModuleId || 'hanzi'
    })
  },

  openModule(event) {
    const { moduleId } = event.currentTarget.dataset
    wx.navigateTo({ url: `/pages/module/module?moduleId=${moduleId}` })
  },

  continueLearning() {
    wx.navigateTo({ url: `/pages/module/module?moduleId=${this.data.continueModuleId}` })
  },

  startToday() {
    wx.navigateTo({ url: '/packages/hanzi-practice/pages/today/index' })
  },

  openReading() {
    wx.navigateTo({ url: '/packages/hanzi-practice/pages/reading/index' })
  },

  openStickers() {
    wx.navigateTo({ url: '/pages/stickers/stickers' })
  }
})
