const { loadHanziFont } = require('../../../../utils/hanzi-font')
const fontSource = () => require('../../fonts/hanzi-kai.js')
const { getProgress } = require('../../../../utils/progress')
const { playAudioPath, stopAudio } = require('../../../../utils/audio')
const { eligibleSentences, sentenceUnits } = require('../../data/reading')
const { selectReading, finishReading, todayKey } = require('../../utils/session')
const { readingTests, recordAnswer } = require('../../utils/reading-tests')

Page({
  onReady() { this.loadFont() },
  loadFont() { loadHanziFont(this, fontSource) },
  data: { fontReady: false, fontError: false, sentence: null, characters: [], showPinyin: false, selectedIndex: -1, isToday: false, hasPrevious: false, hasNext: false,
    testMode: true, tests: [], testIndex: -1, testTitle: '', independent: 0, helped: 0, answered: 0, position: 0, total: 0, currentAnswer: '' },
  onLoad(options) { this.isToday = options.today === '1'; this.requestedId = options.id; this.day = todayKey(); this.freeReading = Boolean(options.id) },
  onShow() {
    this.day = todayKey()
    const progress = getProgress()
    this.tests = readingTests(progress)
    this.setData({ tests: this.tests.map(test => ({ title: test.title, unlocked: test.unlocked, ready: test.ready })), isToday: this.isToday })
    if (!this.isToday && !this.freeReading) {
      const previous = this.tests.findIndex(test => test.id === this.testId && test.unlocked)
      const latest = this.tests.reduce((selected, test, index) => test.unlocked ? index : selected, -1)
      this.openTest(previous >= 0 ? previous : latest)
      return
    }
    this.setData({ testMode: false })
    this.sentences = eligibleSentences(progress)
    const selected = this.isToday ? selectReading(progress, this.day) :
      this.sentences.find((sentence) => sentence.id === (this.data.sentence && this.data.sentence.id || this.requestedId)) || this.sentences[0]
    this.select(selected)
  },
  openTest(index) {
    const test = this.tests[index]
    this.testId = test ? test.id : ''
    this.sentences = test && test.unlocked && test.ready ? test.sentences : []
    this.setData({ testMode: true, testIndex: index, testTitle: test ? test.title : '',
      independent: test ? test.independent : 0, helped: test ? test.helped : 0, answered: test ? test.independent + test.helped : 0 })
    const next = test && this.sentences.find(sentence => !test.answers[sentence.id])
    this.select(next || this.sentences[0])
  },
  chooseTest(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!this.tests[index] || !this.tests[index].unlocked) return
    this.freeReading = false
    this.openTest(index)
  },
  showTests() { this.freeReading = false; this.onShow() },
  showFreeReading() { this.freeReading = true; this.onShow() },
  select(sentence) {
    stopAudio()
    if (!sentence) { this.setData({ sentence: null, characters: [], hasPrevious: false, hasNext: false, position: 0, total: 0, currentAnswer: '' }); return }
    const units = sentenceUnits(sentence)
    let index = 0
    const characters = [...sentence.text].map((char) => {
      if (!/[\u4e00-\u9fff]/.test(char)) return { char, punctuation: true, pinyin: '', id: '' }
      const unit = units[index]
      return { char, punctuation: false, id: unit.id, pinyin: sentence.pinyin[index++] }
    })
    this.index = this.sentences.findIndex((item) => item.id === sentence.id)
    this.setData({ sentence, characters, showPinyin: false, selectedIndex: -1,
      position: this.index + 1, total: this.sentences.length,
      currentAnswer: this.data.testMode ? this.tests[this.data.testIndex].answers[sentence.id] || '' : '',
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
    if (this.data.testMode) { this.answerTest('independent'); return }
    finishReading(this.data.sentence.id, this.day)
    if (this.isToday) wx.navigateBack()
    else wx.showToast({ title: '这句话读过啦！', icon: 'success' })
  },
  finishWithHelp() { this.answerTest('helped') },
  answerTest(answer) {
    const test = this.tests[this.data.testIndex]
    if (!this.data.testMode || !test || !test.unlocked || !this.data.sentence) return
    stopAudio()
    recordAnswer(test.id, this.data.sentence.id, answer)
    finishReading(this.data.sentence.id, this.day)
    test.answers[this.data.sentence.id] = answer
    test.independent = test.sentences.filter(sentence => test.answers[sentence.id] === 'independent').length
    test.helped = test.sentences.filter(sentence => test.answers[sentence.id] === 'helped').length
    this.setData({ independent: test.independent, helped: test.helped, answered: test.independent + test.helped, currentAnswer: answer })
    const next = this.sentences.slice(this.index + 1).concat(this.sentences.slice(0, this.index)).find(sentence => !test.answers[sentence.id])
    if (next) this.select(next)
    else wx.showToast({ title: '这组 10 句读完啦', icon: 'success' })
  },
  startToday() { wx.redirectTo({ url: '/packages/hanzi-practice/pages/today/index' }) },
  onHide() { stopAudio() },
  onUnload() { this.fontUnloaded = true; stopAudio() }
})
