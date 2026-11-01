const { createQuestion } = require('../../utils/number-bonds')

Page({
  data: {
    stage: 'quantity', limit: 5, whole: 3, left: 1, right: 2,
    missing: '', response: '', correct: false, showDots: true,
    questionNumber: 0, counted: 0, previousWhole: null, feedback: '', reading: '',
    wholeChoices: [], numberChoices: [], leftDots: [], rightDots: [], tenFrame: []
  },

  onLoad() { this.render() },

  render(changes = {}) {
    const next = { ...this.data, ...changes }
    const dots = count => Array.from({ length: count }, (_, index) => index)
    const reading = next.stage === 'learn' || next.correct
      ? next.whole + ' 可以分成 ' + next.left + ' 和 ' + next.right + '。' + next.left + ' 和 ' + next.right + ' 组成 ' + next.whole + '。'
      : ''
    this.setData({
      ...changes, reading,
      wholeChoices: Array.from({ length: next.limit - (next.stage === 'quantity' ? 0 : 1) }, (_, index) => index + (next.stage === 'quantity' ? 1 : 2)),
      numberChoices: dots(next.limit + 1),
      leftDots: dots(next.left), rightDots: dots(next.right),
      tenFrame: Array.from({ length: 10 }, (_, index) => ({
        index, filled: index < next.whole, counted: index < next.counted
      }))
    })
  },

  changeStage(event) {
    const stage = event.currentTarget.dataset.stage
    if (!['quantity', 'learn', 'practice'].includes(stage) || stage === this.data.stage) return
    this.setData({ stage, whole: Math.max(2, this.data.whole), questionNumber: 0 })
    if (stage === 'practice') this.nextQuestion()
    else this.resetSplit()
  },

  changeLimit(event) {
    const limit = Number(event.currentTarget.dataset.limit)
    if (![5, 10].includes(limit) || limit === this.data.limit) return
    this.setData({ limit, whole: Math.min(this.data.whole, limit), questionNumber: 0 })
    if (this.data.stage === 'practice') this.nextQuestion()
    else this.resetSplit()
  },

  changeWhole(event) {
    const whole = Number(event.currentTarget.dataset.whole)
    if (this.data.stage === 'practice' || !Number.isInteger(whole) || whole < (this.data.stage === 'quantity' ? 1 : 2) || whole > this.data.limit) return
    this.setData({ whole })
    this.resetSplit()
  },

  resetSplit() {
    this.render({
      left: 1, right: this.data.whole - 1, counted: 0, previousWhole: null,
      missing: '', response: '', correct: false, showDots: true, feedback: ''
    })
  },

  countStar(event) {
    if (this.data.stage !== 'quantity') return
    const index = Number(event.currentTarget.dataset.index)
    if (index !== this.data.counted || index >= this.data.whole) return
    const counted = this.data.counted + 1
    const { previousWhole, whole } = this.data
    const result = previousWhole === null
      ? '最后数到 ' + whole + '，这一堆一共有 ' + whole + ' 颗。'
      : previousWhole + ' 颗' + (whole > previousWhole ? '添 1 颗' : '拿走 1 颗') + '，现在有 ' + whole + ' 颗。' + (whole > previousWhole ? previousWhole + ' 后面是 ' + whole + '。' : '')
    this.render({
      counted,
      feedback: counted === this.data.whole
        ? result
        : '数到 ' + counted + '，再点下一颗。'
    })
  },

  changeQuantity(event) {
    if (this.data.stage !== 'quantity' || this.data.counted !== this.data.whole) return
    const delta = Number(event.currentTarget.dataset.delta)
    const whole = this.data.whole + delta
    if (![-1, 1].includes(delta) || whole < 1 || whole > this.data.limit) return
    this.render({
      previousWhole: this.data.whole, whole, counted: 0, left: 1, right: whole - 1,
      feedback: '星星' + (delta === 1 ? '添了' : '拿走了') + ' 1 颗。可以从 1 开始，再点数一遍。'
    })
  },

  moveStar(event) {
    if (this.data.stage !== 'learn') return
    const part = event.currentTarget.dataset.part
    if (!['left', 'right'].includes(part) || this.data[part] === 0) return
    const delta = part === 'left' ? -1 : 1
    this.render({ left: this.data.left + delta, right: this.data.right - delta })
  },

  nextQuestion() {
    const questionNumber = this.data.questionNumber + 1
    const missing = ['left', 'right', 'whole'][(questionNumber - 1) % 3]
    this.render({
      ...createQuestion(this.data.limit, missing), questionNumber,
      response: '', correct: false, showDots: false, counted: 0, feedback: ''
    })
  },

  chooseNumber(event) {
    if (this.data.stage !== 'practice' || this.data.correct) return
    const number = Number(event.currentTarget.dataset.number)
    if (!Number.isInteger(number) || number < 0 || number > this.data.limit) return
    this.render({ response: String(number), feedback: '' })
  },

  toggleHint() { this.setData({ showDots: !this.data.showDots }) },

  checkAnswer() {
    if (this.data.stage !== 'practice') return
    if (this.data.response === '') {
      this.setData({ feedback: '先点一个数字，再点检查。' })
      return
    }
    const correct = Number(this.data.response) === this.data[this.data.missing]
    this.render({
      correct, showDots: correct || this.data.showDots,
      feedback: correct ? '填对啦！指着图，把下面的话说一遍。' : '再看看：两部分合起来，要和“一共”一样多。可以点“看星星提示”。'
    })
  }
})
