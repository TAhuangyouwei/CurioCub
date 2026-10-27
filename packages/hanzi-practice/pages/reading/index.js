const { getProgress } = require('../../../../utils/progress')
const { playAudioPath, stopAudio } = require('../../../../utils/audio')
const { eligibleSentences, sentenceUnits } = require('../../data/reading')
const { selectReading, finishReading, todayKey } = require('../../utils/session')

Page({
  data: { sentence: null, characters: [], showPinyin: false, selectedIndex: -1, isToday: false, hasPrevious: false, hasNext: false },
  onLoad(options) { this.isToday = options.today === '1'; this.requestedId = options.id; this.day = todayKey() },
  onShow() {
    this.day = todayKey()
    const progress = getProgress()
    this.sentences = eligibleSentences(progress)
    const selected = this.isToday ? selectReading(progress, this.day) :
      this.sentences.find((sentence) => sentence.id === (this.data.sentence && this.data.sentence.id || this.requestedId)) || this.sentences[0]
    this.setData({ isToday: this.isToday })
    this.select(selected)
  },
  select(sentence) {
    stopAudio()
    if (!sentence) { this.setData({ sentence: null, characters: [] }); return }
    const units = sentenceUnits(sentence)
    let index = 0
    const characters = [...sentence.text].map((char) => {
      if (!/[\u4e00-\u9fff]/.test(char)) return { char, punctuation: true, pinyin: '', id: '' }
      const unit = units[index]
      return { char, punctuation: false, id: unit.id, pinyin: sentence.pinyin[index++] }
    })
    this.index = this.sentences.findIndex((item) => item.id === sentence.id)
    this.setData({ sentence, characters, showPinyin: false, selectedIndex: -1,
      hasPrevious: !this.isToday && this.index > 0, hasNext: !this.isToday && this.index < this.sentences.length - 1 })
  },
  playSentence() { if (this.data.sentence) { this.setData({ selectedIndex: -1 }); playAudioPath(this.data.sentence.audio) } },
  playCharacter(event) {
    const index = Number(event.currentTarget.dataset.index)
    const character = this.data.characters[index]
    if (!character || !character.id) return
    this.setData({ selectedIndex: index })
    playAudioPath(`/packages/hanzi-practice/audio/${character.id}.mp3`)
  },
  togglePinyin() { this.setData({ showPinyin: !this.data.showPinyin }) },
  previous() { if (this.data.hasPrevious) this.select(this.sentences[this.index - 1]) },
  next() { if (this.data.hasNext) this.select(this.sentences[this.index + 1]) },
  finish() {
    if (!this.data.sentence) return
    finishReading(this.data.sentence.id, this.day)
    if (this.isToday) wx.navigateBack()
    else wx.showToast({ title: '这句话读过啦！', icon: 'success' })
  },
  startToday() { wx.redirectTo({ url: '/packages/hanzi-practice/pages/today/index' }) },
  onHide() { stopAudio() },
  onUnload() { stopAudio() }
})
