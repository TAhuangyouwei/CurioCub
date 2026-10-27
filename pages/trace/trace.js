// Keep previously shared tracing links working after moving offline resources.
Page({
  onLoad(options) {
    wx.redirectTo({ url: '/packages/hanzi-writing/pages/trace/index?unitId=' + encodeURIComponent(options.unitId || '') })
  }
})
