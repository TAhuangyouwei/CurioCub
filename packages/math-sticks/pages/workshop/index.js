const { LIMIT, createLayout, createSticks, arrangeSticks, dragPosition, dropStick, getSummary } = require('../../sticks')

const INSTRUCTIONS = {
  count: '把火柴从收纳盒拖到数数区，也能拖回去。',
  add: '把火柴分别拖进两组，看看合起来有几根。',
  subtract: '把火柴从“剩下”拖到“拿走”，也能拖回去。'
}

Page({
  data: {
    mode: 'count',
    startCount: 5,
    limit: LIMIT,
    sticks: [],
    zones: [],
    boardHeight: 300,
    chipWidth: 48,
    chipHeight: 48,
    activeId: -1,
    equation: '0 根',
    caption: '数数区里有几根？',
    instruction: INSTRUCTIONS.count
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.layout = createLayout(info.windowWidth * 694 / 750, this.data.mode)
    this.resetBoard()
  },

  onReady() {
    this.measureBoard()
  },

  onResize() {
    this.measureBoard()
  },

  onHide() {
    this.cancelDrag()
  },

  measureBoard() {
    this.cancelDrag()
    wx.createSelectorQuery().in(this).select('.sticks-board').boundingClientRect((rect) => {
      if (!rect || !rect.width) return
      this.drag = null
      this.layout = createLayout(rect.width, this.data.mode)
      this.renderBoard()
    }).exec()
  },

  renderBoard() {
    this.sticks = arrangeSticks(this.sticks, this.layout)
    const summary = getSummary(this.sticks, this.data.mode)
    this.setData({
      sticks: this.sticks.map((stick) => ({ ...stick })),
      zones: this.layout.zones.map((zone) => ({ ...zone, count: summary.counts[zone.id] })),
      boardHeight: this.layout.height,
      chipWidth: this.layout.chipWidth,
      chipHeight: this.layout.chipHeight,
      equation: summary.equation,
      caption: summary.caption,
      activeId: -1
    })
  },

  resetBoard() {
    this.drag = null
    this.sticks = createSticks(this.data.mode, this.data.startCount)
    this.renderBoard()
  },

  changeMode(event) {
    const mode = event.currentTarget.dataset.mode
    if (!INSTRUCTIONS[mode] || mode === this.data.mode) return
    this.setData({ mode, instruction: INSTRUCTIONS[mode] })
    this.layout = createLayout(this.layout.width, mode)
    this.resetBoard()
  },

  changeTotal(event) {
    const total = this.data.startCount + Number(event.currentTarget.dataset.delta)
    if (total < 0 || total > LIMIT) return
    this.setData({ startCount: total })
    this.resetBoard()
  },

  onDragStart(event) {
    if (this.drag || event.touches.length !== 1) return
    const id = Number(event.currentTarget.dataset.id)
    const stick = this.sticks.find((item) => item.id === id)
    if (!stick) return
    const touch = event.touches[0]
    this.drag = { id, identifier: touch.identifier, x: stick.x, y: stick.y, pageX: touch.pageX, pageY: touch.pageY }
    this.setData({ activeId: id })
  },

  onDragMove(event) {
    if (!this.drag || Number(event.currentTarget.dataset.id) !== this.drag.id) return
    const touch = event.touches.find((item) => item.identifier === this.drag.identifier)
    if (!touch) return
    const position = dragPosition(this.drag, touch)
    const index = this.sticks.findIndex((item) => item.id === this.drag.id)
    this.setData({
      [`sticks[${index}].x`]: Math.max(0, Math.min(this.layout.width - this.layout.chipWidth, position.x)),
      [`sticks[${index}].y`]: Math.max(0, Math.min(this.layout.height - this.layout.chipHeight, position.y))
    })
  },

  onDragEnd(event) {
    if (!this.drag || Number(event.currentTarget.dataset.id) !== this.drag.id) return
    const touch = event.changedTouches.find((item) => item.identifier === this.drag.identifier)
    if (!touch) return
    const position = dragPosition(this.drag, touch)
    this.sticks = dropStick(this.sticks, this.drag.id, position, this.layout)
    this.drag = null
    this.renderBoard()
  },

  onDragCancel(event) {
    if (this.drag && Number(event.currentTarget.dataset.id) === this.drag.id) this.cancelDrag()
  },

  cancelDrag() {
    if (!this.drag) return
    this.drag = null
    this.renderBoard()
  }
})
