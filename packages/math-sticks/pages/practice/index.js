const { generateQuestions } = require('../../utils/arithmetic')

Page({
  data: {
    operation: 'add', limitText: '10', questions: [],
    roundOperation: 'add', roundLimit: 10, checked: false, correctCount: 0
  },

  changeOperation(event) {
    const operation = event.currentTarget.dataset.operation
    if (['add', 'subtract'].includes(operation)) this.setData({ operation })
  },

  onLimitInput(event) { this.setData({ limitText: event.detail.value }) },

  generate() {
    const limit = Number(this.data.limitText)
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      wx.showToast({ title: '请输入1～100的整数', icon: 'none' })
      return
    }
    const questions = generateQuestions(this.data.operation, limit).map((question, index) => ({
      ...question, id: index + 1, response: '', correct: false
    }))
    this.setData({ questions, roundOperation: this.data.operation, roundLimit: limit, checked: false, correctCount: 0 })
  },

  onAnswerInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!this.data.questions[index]) return
    this.setData({ [`questions[${index}].response`]: event.detail.value.trim(), checked: false, correctCount: 0 })
  },

  checkAnswers() {
    if (!this.data.questions.length) return
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
