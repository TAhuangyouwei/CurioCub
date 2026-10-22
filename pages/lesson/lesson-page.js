const { getModule } = require('../../data/learning')
const { getProgress, completeUnit } = require('../../utils/progress')
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
    hintVisible: false,
    completed: false
  },

  onLoad(options) {
    this.moduleId = options.moduleId
    const module = getModule(this.moduleId)
    const unitIndex = module ? module.items.findIndex((item) => item.id === options.unitId) : -1
    if (!module || unitIndex === -1) {
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }

    const groupStart = Math.floor(unitIndex / module.groupSize) * module.groupSize
    this.lessonItems = module.items.slice(groupStart, groupStart + module.groupSize)
    this.setData({
      module,
      lessonItems: this.lessonItems,
      cardTotal: this.lessonItems.length,
      isHanzi: module.id === 'hanzi'
    })
    this.setCurrentCard(unitIndex - groupStart)
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
    const progress = getProgress()
    stopAudio()
    this.setData({
      currentIndex: index,
      currentNumber: index + 1,
      unit,
      hintVisible: false,
      completed: Boolean(progress.completedIds[unit.id])
    })
  },

  refreshCompletion() {
    const unit = this.data.unit
    if (!unit) return
    const progress = getProgress()
    this.setData({ completed: Boolean(progress.completedIds[unit.id]) })
  },

  onCardChange(event) {
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
    if (event.currentTarget.dataset.unitId !== this.data.unit.id) return
    this.setData({ hintVisible: true })
  },

  startChallenge() {
    const { module, unit } = this.data
    stopAudio()
    wx.navigateTo({ url: `${getLearningPage('challenge', unit)}?moduleId=${module.id}&unitId=${unit.id}` })
  },

  markLearned() {
    const { module, unit, isHanzi, completed } = this.data
    if (!isHanzi || completed) return
    stopAudio()
    const previousStickerCount = getProgress().stickerCount
    const progress = completeUnit(unit.id, module.id)
    this.setData({ completed: true })
    wx.navigateTo({
      url: `/pages/reward/reward?moduleId=${module.id}&unitId=${unit.id}&newSticker=${progress.stickerCount > previousStickerCount ? 1 : 0}`
    })
  },

  returnToModule() {
    stopAudio()
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({ url: `/pages/module/module?moduleId=${this.moduleId}` })
      }
    })
  },

  onUnload() {
    stopAudio()
  }
  }
}

module.exports = { createLessonPage }
