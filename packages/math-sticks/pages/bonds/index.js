const { createQuestion, createLayout, slotPosition, arrangeStars, dropStar } = require('../../utils/number-bonds')
const { dragPosition } = require('../../sticks')

Page({
  data: {
    limit: 5, questionNumber: 0, target: 1, initialCount: 0,
    stars: [], fixedStars: [], slots: [], boardHeight: 208, trayTop: 112, zoneHeight: 96,
    activeId: -1, addedCount: 0, basketCount: 0, complete: false, equation: '', feedback: ''
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.layout = createLayout(Math.min(560, info.windowWidth - 32), this.data.limit)
    this.nextQuestion()
  },
  onReady() { this.measureBoard() },
  onResize() { if (this.layout) this.measureBoard() },

  measureBoard() {
    this.cancelDrag()
    wx.createSelectorQuery().in(this).select('.number-board').boundingClientRect(rect => {
      if (this.destroyed || !rect || !rect.width) return
      this.layout = createLayout(rect.width, this.data.limit)
      this.renderBoard()
    }).exec()
  },

  changeLimit(event) {
    const limit = Number(event.currentTarget.dataset.limit)
    if (![5, 10].includes(limit) || limit === this.data.limit) return
    this.layout = createLayout(this.layout.width, limit)
    this.setData({ limit, questionNumber: 0 })
    this.nextQuestion()
  },

  nextQuestion() {
    this.drag = null
    this.setData({ ...createQuestion(this.data.limit), questionNumber: this.data.questionNumber + 1 })
    this.resetBoard()
  },

  resetBoard() {
    this.drag = null
    this.stars = Array.from({ length: this.data.limit }, (_, id) => ({ id, zone: 'tray' }))
    this.renderBoard()
  },

  renderBoard() {
    const { initialCount, target } = this.data
    this.stars = arrangeStars(this.stars, this.layout, initialCount)
    const addedCount = this.stars.filter(star => star.zone === 'basket').length
    const basketCount = initialCount + addedCount
    const complete = basketCount === target
    this.setData({
      stars: this.stars.map(star => ({ ...star })),
      fixedStars: Array.from({ length: initialCount }, (_, id) => ({ id, ...slotPosition(id, this.layout.basket, this.layout) })),
      slots: Array.from({ length: target }, (_, id) => ({ id, ...slotPosition(id, this.layout.basket, this.layout) })),
      boardHeight: this.layout.height, trayTop: this.layout.tray.y, zoneHeight: this.layout.basket.height,
      activeId: -1, addedCount, basketCount, complete,
      equation: complete ? `${initialCount} + ${addedCount} = ${target}` : '',
      feedback: complete ? `凑齐啦！${initialCount}和${addedCount}合起来是${target}。` : basketCount > target ? '多了一些，拖回几颗再试试。' : '慢慢数一数，还需要再放几颗？'
    })
  },

  onDragStart(event) {
    if (this.drag || event.touches.length !== 1) return
    const star = this.stars.find(item => item.id === Number(event.currentTarget.dataset.id))
    if (!star) return
    const touch = event.touches[0]
    this.drag = { id: star.id, identifier: touch.identifier, x: star.x, y: star.y, pageX: touch.pageX, pageY: touch.pageY }
    this.setData({ activeId: star.id })
  },

  onDragMove(event) {
    if (!this.drag) return
    if (event.touches.length !== 1) { this.cancelDrag(); return }
    const touch = event.touches.find(item => item.identifier === this.drag.identifier)
    if (!touch) return
    const position = dragPosition(this.drag, touch)
    const index = this.stars.findIndex(star => star.id === this.drag.id)
    this.setData({
      [`stars[${index}].x`]: Math.max(0, Math.min(this.layout.width - 44, position.x)),
      [`stars[${index}].y`]: Math.max(0, Math.min(this.layout.height - 44, position.y))
    })
  },

  onDragEnd(event) {
    if (!this.drag) return
    const touch = event.changedTouches.find(item => item.identifier === this.drag.identifier)
    if (!touch) return
    this.stars = dropStar(this.stars, this.drag.id, dragPosition(this.drag, touch), this.layout, this.data.initialCount)
    this.drag = null
    this.renderBoard()
  },

  onDragCancel() { this.cancelDrag() },
  cancelDrag() {
    if (!this.drag) return
    this.drag = null
    this.renderBoard()
  },
  onHide() { this.cancelDrag() },
  onUnload() { this.cancelDrag(); this.destroyed = true }
})
