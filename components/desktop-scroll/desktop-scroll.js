Component({
  options: { virtualHost: true },
  properties: { target: { type: String, value: '' } },
  data: { desktop: false },
  lifetimes: {
    attached() {
      const info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}
      this.setData({ desktop: ['windows', 'mac'].includes(info.platform) })
    }
  },
  methods: {
    scroll(event) {
      if (!this.data.desktop) return
      const direction = Number(event.currentTarget.dataset.direction)
      if (direction !== -1 && direction !== 1) return
      const query = wx.createSelectorQuery()
      if (this.data.target) {
        query.select(this.data.target).fields({ node: true, scrollOffset: true, size: true }).exec(results => {
          const result = results[0]
          if (!result || !result.node || typeof result.node.scrollTo !== 'function') {
            wx.showToast({ title: '请拖动右侧滚动条', icon: 'none' })
            return
          }
          result.node.scrollTo({ top: Math.max(0, result.scrollTop + direction * result.height * 0.8), animated: false })
        })
      } else {
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        query.selectViewport().scrollOffset().exec(results => {
          if (!results[0]) return
          wx.pageScrollTo({ scrollTop: Math.max(0, results[0].scrollTop + direction * info.windowHeight * 0.8), duration: 0 })
        })
      }
    }
  }
})
