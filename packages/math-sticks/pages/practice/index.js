const { generateQuestions } = require('../../utils/arithmetic')

Page({
  data: {
    operation: 'add', limitText: '10', questions: [],
    roundOperation: 'add', roundLimit: 10, checked: false, correctCount: 0,
    activeIndex: null, numberKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', '删除']
  },

  changeOperation(event) {
    const operation = event.currentTarget.dataset.operation
    if (['add', 'subtract'].includes(operation)) this.setData({ operation })
  },

  selectLimit() { this.setData({ activeIndex: -1 }) },

  selectAnswer(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index) || !this.data.questions[index]) return
    this.setData({ activeIndex: index })
  },

  closeNumberPad() { this.setData({ activeIndex: null }) },

  onNumberTap(event) {
    const { activeIndex, questions, limitText } = this.data
    if (activeIndex === null) return
    const key = String(event.currentTarget.dataset.key)
    const value = activeIndex === -1 ? limitText : questions[activeIndex].response
    let next
    if (key === '清空') next = ''
    else if (key === '删除') next = value.slice(0, -1)
    else if (/^\d$/.test(key)) next = (value + key).slice(0, 3)
    else return
    if (next === value) return
    if (activeIndex === -1) this.setData({ limitText: next })
    else this.setData({ [`questions[${activeIndex}].response`]: next, checked: false, correctCount: 0 })
  },

  onHide() { this.closeNumberPad() },

  generate() {
    const limit = Number(this.data.limitText)
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      wx.showToast({ title: '请输入1～100的整数', icon: 'none' })
      return
    }
    const questions = generateQuestions(this.data.operation, limit).map((question, index) => ({
      ...question, id: index + 1, response: '', correct: false
    }))
    this.setData({ questions, roundOperation: this.data.operation, roundLimit: limit, checked: false, correctCount: 0, activeIndex: null })
  },

  checkAnswers() {
    if (!this.data.questions.length) return
    this.closeNumberPad()
    const missing = this.data.questions.filter(question => question.response === '').length
    if (missing) {
      wx.showToast({ title: `还有${missing}题没填`, icon: 'none' })
      return
    }
    if (this.data.questions.some(question => !/^\d+$/.test(question.response))) {
      wx.showToast({ title: '请填写数字答案', icon: 'none' })
      return
    }
    const questions = this.data.questions.map(question => ({ ...question, correct: Number(question.response) === question.answer }))
    this.setData({ questions, checked: true, correctCount: questions.filter(question => question.correct).length })
  }
})
