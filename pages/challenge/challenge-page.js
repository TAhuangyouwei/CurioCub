const { getModule, getUnit } = require('../../data/learning')
const { getProgress, completeUnit } = require('../../utils/progress')
const { playAudio, stopAudio } = require('../../utils/audio')

function createChallengePage() {
  return {
  data: {
    module: null,
    unit: null,
    options: [],
    selected: '',
    feedback: '',
    feedbackKind: '',
    isHanzi: false
  },

  onLoad(options) {
    const module = getModule(options.moduleId)
    const unit = getUnit(options.moduleId, options.unitId)
    if (!module || !unit) {
      wx.navigateBack()
      return
    }

    const shuffled = unit.options.slice().sort(() => Math.random() - 0.5)
    this.setData({
      module,
      unit,
      options: shuffled,
      isHanzi: module.id === 'hanzi'
    })
    wx.setNavigationBarTitle({ title: 'Cubi 小挑战' })
  },

  playQuestionAudio() {
    const { unit, isHanzi } = this.data
    playAudio(isHanzi ? unit.characterAudioFile : unit.audioFile)
  },

  chooseAnswer(event) {
    if (this.data.feedbackKind === 'success') return

    const { answer } = event.currentTarget.dataset
    const correct = answer === this.data.unit.answer
    this.setData({ selected: answer })

    if (!correct) {
      this.setData({ feedback: '再听一遍，慢慢想！', feedbackKind: 'retry' })
      return
    }

    const before = getProgress()
    const wasCompleted = Boolean(before.completedIds[this.data.unit.id])
    const progress = completeUnit(this.data.unit.id, this.data.module.id)
    const earnedSticker = !wasCompleted && progress.stickerCount > before.stickerCount
    this.setData({ feedback: wasCompleted ? '你已经会这一关啦！' : '答对啦，星星到手！', feedbackKind: 'success' })

    this.redirectTimer = setTimeout(() => {
      wx.redirectTo({
        url: `/pages/reward/reward?moduleId=${this.data.module.id}&unitId=${this.data.unit.id}&newSticker=${earnedSticker ? 1 : 0}`
      })
    }, 700)
  },

  onUnload() {
    stopAudio()
    clearTimeout(this.redirectTimer)
  }
  }
}

module.exports = { createChallengePage }
