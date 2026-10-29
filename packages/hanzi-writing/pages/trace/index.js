Page({
  onLoad(options) {
    wx.redirectTo({ url: '/packages/hanzi-practice/pages/trace/index?unitId=' + encodeURIComponent(options.unitId || '') + (options.source === 'notebook' ? '&source=notebook' : '') })
  }
})
