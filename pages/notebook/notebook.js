const { getModule } = require('../../data/learning')
const { getProgress } = require('../../utils/progress')
const { getLearningPage } = require('../../utils/learning-navigation')

Page({
  data: {
    items: []
  },

  onShow() {
    const progress = getProgress()
    const items = getModule('hanzi').items.filter((unit) => progress.unlearnedIds[unit.id])
    this.setData({ items })
  },

  openLesson(event) {
    const unit = this.data.items.find((item) => item.id === event.currentTarget.dataset.unitId)
    if (!unit) return
    wx.navigateTo({ url: `${getLearningPage('lesson', unit)}?moduleId=hanzi&unitId=${unit.id}&source=notebook` })
  }
})
