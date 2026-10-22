const { getProgress } = require('../../utils/progress')

const stickerSeed = require('../../data/stickers')

Page({
  data: {
    stars: 0,
    stickers: []
  },

  onShow() {
    const progress = getProgress()
    this.setData({
      stars: progress.stars,
      stickers: stickerSeed.map(([icon, name], index) => ({
        icon,
        name,
        number: index + 1,
        unlocked: index < progress.stickerCount
      }))
    })
    wx.setNavigationBarTitle({ title: '动物贴纸册' })
  }
})
