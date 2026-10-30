const { topics, createRound, optionsFor, recordAnswer, recordMiss, getReviewWords } = require('../../../../utils/english-listening')
const { playAudio, stopAudio } = require('../../../../utils/audio')

Page({
  data: { topics, topic: 'all', started: false, finished: false, heard: false, answered: false,
    topicIndex: 0, topicTitle: topics[0].title, reviewCount: 0,
    options: [], selected: '', feedback: '', word: null, position: 0, total: 0, firstCorrectCount: 0, retryWords: [] },

  onLoad(options = {}) {
    const index = topics.findIndex(topic => topic.id === options.topic)
    if (index >= 0) this.setData({ topic: options.topic, topicIndex: index, topicTitle: topics[index].title })
  },

  onShow() { this.refreshReview() },
  refreshReview() { this.setData({ reviewCount: getReviewWords().length }) },

  changeTopic(event) {
    const index = Number(event.detail.value)
    this.setData({ topic: topics[index].id, topicIndex: index, topicTitle: topics[index].title })
  },

  start() { if (!this.data.started) this.beginRound() },
  startReview() {
    if (!this.data.started) this.beginRound(getReviewWords().slice(0, 5).map(word => word.id), 'all')
  },
  retry() {
    if (this.data.finished && this.data.retryWords.length) this.beginRound(this.data.retryWords.map(word => word.id), this.activeTopic)
  },

  beginRound(ids, topic = this.data.topic) {
    stopAudio()
    this.round = createRound(topic, ids)
    if (!this.round.length) {
      this.refreshReview()
      wx.showToast({ title: '这些词都练好啦', icon: 'none' })
      return
    }
    this.activeTopic = topic
    this.results = []
    this.index = 0
    this.setData({ started: true, finished: false, total: this.round.length, firstCorrectCount: 0, retryWords: [] })
    this.showQuestion()
  },

  showQuestion() {
    this.currentWord = this.round[this.index]
    this.wrong = false
    this.setData({ position: this.index + 1, heard: false, answered: false, selected: '', word: null,
      feedback: '先点小喇叭，再找对应的图片。', options: optionsFor(this.currentWord) })
  },

  listen() {
    if (!this.currentWord || this.data.finished) return
    if (playAudio(this.currentWord.audioFile)) this.setData({ heard: true })
  },

  choose(event) {
    if (!this.data.started || this.data.finished || this.data.answered) return
    if (!this.data.heard) {
      this.setData({ feedback: '先点小喇叭听一听。' })
      return
    }
    const id = event.currentTarget.dataset.id
    if (!this.data.options.some(option => option.id === id)) return
    if (id !== this.currentWord.id) {
      this.wrong = true
      recordMiss(this.currentWord.id)
      this.setData({ selected: id, feedback: '再听一遍，换张图片试试。' })
      return
    }
    const firstCorrect = !this.wrong
    recordAnswer(id, firstCorrect)
    this.results.push({ ...this.currentWord, firstCorrect })
    stopAudio()
    this.setData({ selected: id, answered: true, word: this.currentWord, feedback: '找对啦！可以听一听，跟着说。' })
  },

  next() {
    if (!this.data.answered || this.data.finished) return
    stopAudio()
    this.index += 1
    if (this.index < this.round.length) return this.showQuestion()
    this.currentWord = null
    this.setData({ finished: true, firstCorrectCount: this.results.filter(word => word.firstCorrect).length,
      retryWords: this.results.filter(word => !word.firstCorrect) })
    this.refreshReview()
  },

  chooseAgain() {
    stopAudio()
    this.currentWord = null
    this.setData({ started: false, finished: false })
    this.refreshReview()
  },

  goBack() { wx.navigateBack() },
  onHide() { stopAudio() },
  onUnload() { stopAudio() }
})
