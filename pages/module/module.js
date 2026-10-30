const { getModule, getLearningGroups } = require('../../data/learning')
const { getProgress, getUnitStatus, completeUnit } = require('../../utils/progress')
const { getLearningPage } = require('../../utils/learning-navigation')
const { loadPinyinFont } = require('../../utils/pinyin-font')
const { startHanziLesson } = require('../../utils/start-lesson')
const { getHanziSettings, exitRange, studyUnits, setAutoRead, orderedHanzi } = require('../../utils/hanzi-settings')

Page({
  data: {
    module: null,
    isLiteracy: false, isPinyin: false,
    groups: [],
    stars: 0,
    unlearnedCount: 0, learnedCount: 0, unseenCount: 0,
    rangeEnabled: false, rangeSummary: '', autoRead: true
  },

  onLoad(options) {
    this.moduleId = options.moduleId || 'hanzi'
    this.collapsedGroups = {}
  },

  onShow() {
    let module = getModule(this.moduleId)
    if (!module) {
      wx.navigateBack()
      return
    }

    const progress = getProgress()
    if (module.id === 'pinyin') loadPinyinFont(this)
    if (module.id === 'hanzi') module = { ...module, items: orderedHanzi() }
    const settings = module.id === 'hanzi' ? getHanziSettings() : null
    const rangeIds = settings && settings.rangeEnabled ? new Set(studyUnits(module.items, settings).map(unit => unit.id)) : null
    const groups = []
    const visibleItems = module.id === 'math' ? module.items.slice(0, 10) : module.items
    const isLiteracy = module.id === 'hanzi' || module.id === 'pinyin'
    for (const groupItems of getLearningGroups({ ...module, items: visibleItems })) {
      const items = groupItems.map(item => {
        const status = getUnitStatus(item.id, progress)
        return { ...item, status, completed: status === 'learned', unlearned: status === 'unlearned' }
      })
      const completed = items.filter(item => item.completed).length
      const unlearned = items.filter(item => item.unlearned).length
      const complete = completed === items.length
      const outsideRange = Boolean(rangeIds && !items.some(item => rangeIds.has(item.id)))
      const active = completed > 0 || unlearned > 0
      groups.push({
        index: groups.length,
        number: groups.length + 1,
        items,
        collapsed: isLiteracy && (outsideRange || this.collapsedGroups[groups.length] !== false),
        category: items[0].category || '',
        preview: module.id === 'hanzi' ? items.map(item => item.title).join(' ') : '',
        completed,
        unlearned,
        unseen: items.length - completed - unlearned,
        percent: Math.round(completed / items.length * 100),
        total: items.length,
        complete,
        outsideRange,
        stateLabel: complete ? '完成' : active ? '进行中' : '未开始',
        startUnitId: (items.find(item => !rangeIds || rangeIds.has(item.id)) || items[0]).id
      })
    }

    wx.setNavigationBarTitle({ title: module.title })
    const statuses = groups.flatMap(group => group.items)
    const unlearnedCount = statuses.filter(item => item.status === 'unlearned').length
    const learnedCount = statuses.filter(item => item.status === 'learned').length
    this.setData({ module, groups, isLiteracy, isPinyin: module.id === 'pinyin', stars: progress.stars, unlearnedCount, learnedCount, unseenCount: statuses.length - learnedCount - unlearnedCount })
    if (module.id === 'hanzi') {
      this.refreshRange()
    }
  },

  openGroup(event) {
    if (!['hanzi', 'pinyin'].includes(this.moduleId)) return
    const index = Number(event.currentTarget.dataset.groupIndex)
    const group = this.data.groups[index]
    if (!Number.isInteger(index) || !group || group.outsideRange) return
    return this.openLesson({ currentTarget: { dataset: { unitId: group.startUnitId } } })
  },

  toggleGroup(event) {
    if (!['hanzi', 'pinyin'].includes(this.moduleId)) return
    const index = Number(event.currentTarget.dataset.groupIndex)
    const group = this.data.groups[index]
    if (!Number.isInteger(index) || !group || group.outsideRange) return
    this.collapsedGroups[index] = !group.collapsed
    this.setData({ [`groups[${index}].collapsed`]: !group.collapsed })
  },

  markGroupLearned(event) {
    if (!['hanzi', 'pinyin'].includes(this.moduleId)) return
    const index = Number(event.currentTarget.dataset.groupIndex)
    const group = this.data.groups[index]
    if (!Number.isInteger(index) || !group || group.complete || group.outsideRange) return
    group.items.forEach(unit => completeUnit(unit.id, this.moduleId))
    this.onShow()
    wx.showToast({ title: '本站全部学会啦', icon: 'success', duration: 1200, mask: false })
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
  exitLearningRange() { exitRange(); this.onShow() },
  startRangeLearning() {
    const unit = studyUnits(this.data.module.items)[0]
    return startHanziLesson(this, unit)
  },
  changeAutoRead(event) { setAutoRead(event.detail.value); this.setData({ autoRead: event.detail.value }) },

  openLesson(event) {
    const { unitId } = event.currentTarget.dataset
    const unit = this.data.module.items.find((item) => item.id === unitId)
    if (this.moduleId === 'hanzi' && !studyUnits([unit]).length) {
      wx.showToast({ title: '这个字在范围外，请先调整学习范围', icon: 'none' })
      return
    }
    if (this.moduleId === 'hanzi') return startHanziLesson(this, unit)
    wx.navigateTo({ url: `${getLearningPage('lesson', unit)}?moduleId=${this.moduleId}&unitId=${unitId}` })
  },

  openReview(event) {
    const { groupIndex } = event.currentTarget.dataset
    if (this.moduleId === 'hanzi' && this.data.groups[groupIndex] && this.data.groups[groupIndex].outsideRange) return
    const group = this.data.groups[groupIndex]
    if (!group) return
    const unit = group.items[0]
    wx.navigateTo({ url: `${getLearningPage('review', unit)}?moduleId=${this.moduleId}&groupIndex=${groupIndex}` })
  },

  openPinyinWorkshop() {
    wx.navigateTo({ url: '/packages/pinyin-04/pages/builder/index' })
  },

  openEnglishListening(event) {
    const topic = event.currentTarget.dataset.topic || 'all'
    wx.navigateTo({ url: `/pages/english-listening/english-listening?topic=${topic}` })
  },

  openEnglishVocabulary() {
    wx.navigateTo({ url: '/packages/english-vocabulary/pages/cards/index' })
  },

  openNotebook() {
    wx.navigateTo({ url: this.moduleId === 'pinyin' ? '/pages/notebook/notebook?moduleId=pinyin' : '/pages/notebook/notebook' })
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
