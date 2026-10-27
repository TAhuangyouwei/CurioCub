const { getModule } = require('../../data/learning')
const { getProgress } = require('../../utils/progress')
const { getLearningPage } = require('../../utils/learning-navigation')

Page({
  data: {
    module: null,
    groups: [],
    stars: 0,
    unlearnedCount: 0
  },

  onLoad(options) {
    this.moduleId = options.moduleId || 'hanzi'
  },

  onShow() {
    const module = getModule(this.moduleId)
    if (!module) {
      wx.navigateBack()
      return
    }

    const progress = getProgress()
    const groups = []
    for (let start = 0; start < module.items.length; start += module.groupSize) {
      const items = module.items.slice(start, start + module.groupSize).map((item) => ({
        ...item,
        completed: Boolean(progress.completedIds[item.id]),
        unlearned: Boolean(progress.unlearnedIds[item.id])
      }))
      groups.push({
        index: groups.length,
        number: groups.length + 1,
        items,
        completed: items.filter((item) => item.completed).length,
        total: items.length,
        complete: items.every((item) => item.completed)
      })
    }

    wx.setNavigationBarTitle({ title: module.title })
    const unlearnedCount = module.items.filter((item) => progress.unlearnedIds[item.id]).length
    this.setData({ module, groups, stars: progress.stars, unlearnedCount })
  },

  openLesson(event) {
    const { unitId } = event.currentTarget.dataset
    const unit = this.data.module.items.find((item) => item.id === unitId)
    wx.navigateTo({ url: `${getLearningPage('lesson', unit)}?moduleId=${this.moduleId}&unitId=${unitId}` })
  },

  openReview(event) {
    const { groupIndex } = event.currentTarget.dataset
    const unit = this.data.module.items[groupIndex * this.data.module.groupSize]
    wx.navigateTo({ url: `${getLearningPage('review', unit)}?moduleId=${this.moduleId}&groupIndex=${groupIndex}` })
  },

  openPinyinWorkshop() {
    wx.navigateTo({ url: '/packages/pinyin-04/pages/builder/index' })
  },

  openNotebook() {
    wx.navigateTo({ url: '/pages/notebook/notebook' })
  },

  openMathWorkshop() {
    wx.navigateTo({ url: '/packages/math-sticks/pages/workshop/index' })
  }
})
