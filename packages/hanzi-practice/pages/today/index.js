const { getModule } = require('../../../../data/learning')
const { getProgress, completeUnit, markUnitUnlearned } = require('../../../../utils/progress')
const { playAudioPath, stopAudio } = require('../../../../utils/audio')
const { getToday, finishCard, selectReading, todayKey } = require('../../utils/session')

Page({
  data: { unit: null, position: 0, total: 0, practiceDone: false, reading: null, readingDone: false, hintVisible: false },
  onLoad() { this.day = todayKey() },
  onShow() { this.refresh() },
  refresh() {
    this.day = todayKey()
    const progress = getProgress()
    this.session = getToday(progress, this.day)
    const index = this.session.cards.findIndex((card) => !card.done)
    const card = this.session.cards[index]
    this.card = card
    const unit = card ? getModule('hanzi').items.find((item) => item.id === card.id) : null
    const reading = index === -1 ? selectReading(progress, this.day) : null
    this.setData({ unit, review: Boolean(card && card.review), position: index + 1, total: this.session.cards.length,
      practiceDone: index === -1, reading, readingDone: this.session.readingDone, hintVisible: false })
  },
  playCharacter() {
    if (this.data.unit) playAudioPath(`/packages/hanzi-practice/audio/${this.data.unit.id}.mp3`)
  },
  showHint() { this.setData({ hintVisible: true }) },
  finish(event) {
    if (!this.card || this.busy) return
    this.busy = true
    stopAudio()
    if (event.currentTarget.dataset.learned === 'yes') completeUnit(this.card.id, 'hanzi')
    else markUnitUnlearned(this.card.id, 'hanzi')
    this.session = finishCard(this.session, this.card.id)
    this.refresh()
    this.busy = false
  },
  openReading() { wx.navigateTo({ url: '/packages/hanzi-practice/pages/reading/index?today=1' }) },
  goHome() { wx.reLaunch({ url: '/pages/index/index' }) },
  onHide() { stopAudio() },
  onUnload() { stopAudio() }
})
