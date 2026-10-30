const { getModule } = require('../../data/learning')
const { getProgress, clearNotebook } = require('../../utils/progress')
const { startHanziLesson } = require('../../utils/start-lesson')
const { loadPinyinFont } = require('../../utils/pinyin-font')

Page({
  data: {
    items: [], moduleId: 'hanzi', notebookTitle: '生字本', unitLabel: '个字'
  },

  onLoad(options = {}) {
    if (options.moduleId === 'pinyin') {
      loadPinyinFont(this)
      this.setData({ moduleId: 'pinyin', notebookTitle: '拼音复习本', unitLabel: '项' })
      wx.setNavigationBarTitle({ title: '拼音复习本' })
    }
  },

  onShow() {
    const progress = getProgress()
    const items = getModule(this.data.moduleId).items.filter((unit) => progress.unlearnedIds[unit.id])
    this.setData({ items })
  },

  clearNotebook() {
    if (!this.data.items.length) return
    wx.showModal({
      title: `清空${this.data.notebookTitle}？`,
      content: `将本里的 ${this.data.items.length} ${this.data.unitLabel}恢复为“未学习”。已学会的记录、星星和贴纸会保留。`,
      confirmText: '清空',
      success: result => {
        if (!result.confirm) return
        clearNotebook(getModule(this.data.moduleId).items.map(unit => unit.id))
        this.onShow()
        wx.showToast({ title: `${this.data.notebookTitle}已清空`, icon: 'success' })
      }
    })
  },

  openLesson(event) {
    const unit = this.data.items.find((item) => item.id === event.currentTarget.dataset.unitId)
    if (!unit) return
    if (this.data.moduleId === 'pinyin') {
      wx.navigateTo({ url: `/pages/lesson/lesson?moduleId=pinyin&unitId=${unit.id}&source=notebook` })
      return
    }
    return startHanziLesson(this, unit, 'notebook')
  }
})
