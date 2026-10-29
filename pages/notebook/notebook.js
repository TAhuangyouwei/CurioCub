const { getModule } = require('../../data/learning')
const { getProgress, clearNotebook } = require('../../utils/progress')
const { startHanziLesson } = require('../../utils/start-lesson')

Page({
  data: {
    items: []
  },

  onShow() {
    const progress = getProgress()
    const items = getModule('hanzi').items.filter((unit) => progress.unlearnedIds[unit.id])
    this.setData({ items })
  },

  clearNotebook() {
    if (!this.data.items.length) return
    wx.showModal({
      title: '清空生字本？',
      content: `将本里的 ${this.data.items.length} 个字恢复为“未学习”。已学会的字、星星和贴纸会保留。`,
      confirmText: '清空',
      success: result => {
        if (!result.confirm) return
        clearNotebook(getModule('hanzi').items.map(unit => unit.id))
        this.onShow()
        wx.showToast({ title: '生字本已清空', icon: 'success' })
      }
    })
  },

  openLesson(event) {
    const unit = this.data.items.find((item) => item.id === event.currentTarget.dataset.unitId)
    if (!unit) return
    return startHanziLesson(this, unit, 'notebook')
  }
})
