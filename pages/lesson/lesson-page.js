const { getModule } = require('../../data/learning')
const { getProgress, completeUnit, markUnitUnlearned } = require('../../utils/progress')
const { playAudio, stopAudio } = require('../../utils/audio')
const { getLearningPage } = require('../../utils/learning-navigation')

function createLessonPage() {
  return {
  data: {
    module: null,
    unit: null,
    lessonItems: [],
    currentIndex: 0,
    currentNumber: 1,
    cardTotal: 0,
    isHanzi: false,
    isNotebook: false,
    hintVisible: false,
    completed: false,
    unlearned: false
  },

  onLoad(options) {
    this.moduleId = options.moduleId
    const module = getModule(this.moduleId)
    const unitIndex = module ? module.items.findIndex((item) => item.id === options.unitId) : -1
    if (!module || unitIndex === -1) {
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }

    const groupStart = module.id === 'hanzi' ? 0 : Math.floor(unitIndex / module.groupSize) * module.groupSize
    const isNotebook = module.id === 'hanzi' && options.source === 'notebook'
    const progress = getProgress()
    this.lessonItems = isNotebook
      ? module.items.filter((item) => progress.unlearnedIds[item.id])
      : (module.id === 'hanzi' ? module.items : module.items.slice(groupStart, groupStart + module.groupSize))
    const currentIndex = this.lessonItems.findIndex((item) => item.id === options.unitId)
    if (currentIndex === -1) {
      wx.redirectTo({ url: '/pages/notebook/notebook' })
      return
    }
    this.setData({
      module,
      lessonItems: this.lessonItems,
      isNotebook,
      isHanzi: module.id === 'hanzi'
    })
    this.setCurrentCard(currentIndex)
  },

  onShow() {
    const request = getApp().globalData.lessonRequest
    if (request && request.moduleId === this.moduleId) {
      getApp().globalData.lessonRequest = null
      if (request.returnToMap) {
        wx.navigateBack()
        return
      }

      const nextIndex = this.lessonItems.findIndex((item) => item.id === request.unitId)
      if (nextIndex !== -1) {
        this.setCurrentCard(nextIndex)
        return
      }
    }

    this.refreshCompletion()
  },

  setCurrentCard(index) {
    const unit = this.lessonItems[index]
    if (!unit) return
    const groupSize = this.data.module.groupSize
    const groupStart = this.data.isHanzi && !this.data.isNotebook ? Math.floor(index / groupSize) * groupSize : 0
    const progress = getProgress()
    stopAudio()
    this.setData({
      currentIndex: index,
      currentNumber: index - groupStart + 1,
      cardTotal: this.data.isNotebook ? this.lessonItems.length : Math.min(groupSize, this.lessonItems.length - groupStart),
      unit,
      hintVisible: false,
      completed: Boolean(progress.completedIds[unit.id]),
      unlearned: Boolean(progress.unlearnedIds[unit.id])
    })
  },

  refreshCompletion() {
    const unit = this.data.unit
    if (!unit) return
    const progress = getProgress()
    this.setData({
      completed: Boolean(progress.completedIds[unit.id]),
      unlearned: Boolean(progress.unlearnedIds[unit.id])
    })
  },

  onCardChange(event) {
    const unit = this.lessonItems[event.detail.current]
    if (this.data.isHanzi && unit && unit.packageName !== this.data.unit.packageName) {
      stopAudio()
      wx.redirectTo({ url: `${getLearningPage('lesson', unit)}?moduleId=${this.moduleId}&unitId=${unit.id}${this.data.isNotebook ? '&source=notebook' : ''}` })
      return
    }
    this.setCurrentCard(event.detail.current)
  },

  playMainAudio() {
    playAudio(this.data.unit.audioFile)
  },

  playCharacterAudio() {
    playAudio(this.data.unit.characterAudioFile)
  },

  playPhraseAudio() {
    playAudio(this.data.unit.phraseAudioFile)
  },

  playCardAudio() {
    const { unit, isHanzi } = this.data
    playAudio(isHanzi ? unit.characterAudioFile : unit.audioFile)
  },

  showHint(event) {
    if (!this.data.isHanzi || event.currentTarget.dataset.unitId !== this.data.unit.id) return
    markUnitUnlearned(this.data.unit.id, this.moduleId)
    this.setData({ hintVisible: true, completed: false, unlearned: true })
  },

  startChallenge() {
    const { module, unit } = this.data
    stopAudio()
    wx.navigateTo({ url: `${getLearningPage('challenge', unit)}?moduleId=${module.id}&unitId=${unit.id}` })
  },

  openTrace() {
    if (!this.data.isHanzi) return
    stopAudio()
    wx.navigateTo({ url: `/packages/hanzi-practice/pages/trace/index?unitId=${this.data.unit.id}` })
  },

  markLearned() {
    const { module, unit, isHanzi, completed } = this.data
    if (!isHanzi || completed) return
    const previousStickerCount = getProgress().stickerCount
    const progress = completeUnit(unit.id, module.id)
    this.setData({ completed: true, unlearned: false })
    wx.showToast({
      title: progress.stickerCount > previousStickerCount ? '解锁新贴纸啦！' : '学会啦！',
      icon: 'success',
      duration: 1200,
      mask: false
    })
  },

  markUnlearned() {
    const { unit, isHanzi } = this.data
    if (!isHanzi) return
    markUnitUnlearned(unit.id, this.moduleId)
    this.setData({ completed: false, unlearned: true })
  },

  returnToModule() {
    stopAudio()
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({ url: this.data.isNotebook ? '/pages/notebook/notebook' : `/pages/module/module?moduleId=${this.moduleId}` })
      }
    })
  },

  onUnload() {
    stopAudio()
  }
  }
}

module.exports = { createLessonPage }
