// Keep existing preview links working after moving the picture assets into a subpackage.
const { groups } = require('../../data/english-vocabulary')
Page({
  onLoad(options = {}) {
    const topic = options.topic === 'all' || groups.some(group => group.id === options.topic) ? options.topic : 'all'
    wx.redirectTo({ url: `/packages/english-vocabulary/pages/listening/index?topic=${topic}` })
  }
})
