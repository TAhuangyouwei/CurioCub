App({
  onLaunch() {
    this.globalData.audio = wx.createInnerAudioContext()
    this.globalData.audio.obeyMuteSwitch = false
  },
  globalData: {
    audio: null,
    lessonRequest: null
  }
})
