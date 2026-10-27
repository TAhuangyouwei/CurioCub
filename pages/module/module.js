const { getModule } = require('../../data/learning')
const { getProgress, getUnitStatus } = require('../../utils/progress')
const { getLearningPage } = require('../../utils/learning-navigation')
const { getHanziSettings, exitRange, studyUnits, setAutoRead, orderedHanzi } = require('../../utils/hanzi-settings')

Page({
  data: {
    module: null,
    groups: [],
    stars: 0,
    unlearnedCount: 0, learnedCount: 0, unseenCount: 0,
    rangeEnabled: false, rangeSummary: '', autoRead: true
  },

  onLoad(options) {
    this.moduleId = options.moduleId || 'hanzi'
  },

  onShow() {
    let module = getModule(this.moduleId)
    if (!module) {
      wx.navigateBack()
      return
    }

    const progress = getProgress()
    if (module.id === 'hanzi') module = { ...module, items: orderedHanzi() }
    const groups = []
    const visibleItems = module.id === 'math' ? module.items.slice(0, 10) : module.items
    for (let start = 0; start < visibleItems.length; start += module.groupSize) {
      const items = module.items.slice(start, start + module.groupSize).map(item => {
        const status = getUnitStatus(item.id, progress)
        return { ...item, status, completed: status === 'learned', unlearned: status === 'unlearned' }
      })
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
    const statuses = groups.flatMap(group => group.items)
    const unlearnedCount = statuses.filter(item => item.status === 'unlearned').length
    const learnedCount = statuses.filter(item => item.status === 'learned').length
    this.setData({ module, groups, stars: progress.stars, unlearnedCount, learnedCount, unseenCount: statuses.length - learnedCount - unlearnedCount })
    if (module.id === 'hanzi') this.refreshRange()
  },

  refreshRange() {
    const settings = getHanziSettings()
    const units = this.data.module.items
    const start = units.findIndex(unit => unit.id === settings.startId)
    const end = units.findIndex(unit => unit.id === settings.endId)
    this.setData({ rangeEnabled: settings.rangeEnabled, autoRead: settings.autoRead,
      rangeSummary: settings.rangeEnabled ? `${start + 1} · ${units[start].title} 至 ${end + 1} · ${units[end].title}，共 ${end - start + 1} 个字` : '未限定，可以学习全部汉字' })
  },
  editRange() { wx.navigateTo({ url: '/pages/learning-range/learning-range' }) },
  editOrder() { wx.navigateTo({ url: '/pages/learning-order/learning-order' }) },
  exitLearningRange() { exitRange(); this.refreshRange() },
  startRangeLearning() {
    const unit = studyUnits(this.data.module.items)[0]
    wx.navigateTo({ url: `${getLearningPage('lesson', unit)}?moduleId=hanzi&unitId=${unit.id}` })
  },
  changeAutoRead(event) { setAutoRead(event.detail.value); this.setData({ autoRead: event.detail.value }) },

  openLesson(event) {
    const { unitId } = event.currentTarget.dataset
    const unit = this.data.module.items.find((item) => item.id === unitId)
    if (this.moduleId === 'hanzi' && !studyUnits([unit]).length) {
      wx.showToast({ title: '这个字在范围外，请先调整学习范围', icon: 'none' })
      return
    }
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
  },

  openMathPractice() {
    wx.navigateTo({ url: '/packages/math-sticks/pages/practice/index' })
  },

  openNumberBonds() {
    wx.navigateTo({ url: '/packages/math-sticks/pages/bonds/index' })
  }
})
