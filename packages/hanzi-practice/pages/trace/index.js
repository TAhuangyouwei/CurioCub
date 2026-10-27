const { getModule } = require('../../../../data/learning')
const { guideFor, pointAlong } = require('../../utils/stroke-guide')

Page({
  data: {
    unit: null,
    boardSize: 0,
    windowHeight: 0,
    bottomInset: 12,
    currentNumber: 1,
    total: 0,
    hasInk: false,
    hasPrevious: false,
    hasNext: false,
    guide: null,
    demonstrating: false,
    demoPoint: null
  },

  onLoad(options) {
    this.units = getModule('hanzi').items
    const index = this.units.findIndex((unit) => unit.id === options.unitId)
    if (index === -1) {
      wx.reLaunch({ url: '/pages/module/module?moduleId=hanzi' })
      return
    }
    this.strokes = []
    this.selectCharacter(index)
    this.updateViewport()
  },

  onReady() {
    if (this.data.unit) this.prepareCanvas()
  },

  updateViewport() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const bottomInset = Math.max(12, info.safeArea ? info.screenHeight - info.safeArea.bottom : 0)
    // Reserve the metadata, instructions, two 48px button rows and safe-area padding.
    const boardSize = Math.floor(Math.min(info.windowWidth - 24, info.windowHeight - 218 - bottomInset))
    this.pixelRatio = info.pixelRatio
    this.setData({ boardSize, windowHeight: info.windowHeight, bottomInset }, () => {
      if (this.canvas) this.prepareCanvas()
    })
  },

  prepareCanvas() {
    wx.createSelectorQuery().in(this).select('#trace-canvas').fields({ node: true, size: true }).exec((results) => {
      if (this.destroyed || !results[0]) return
      const { node, width, height } = results[0]
      this.canvas = node
      this.size = width
      node.width = Math.round(width * this.pixelRatio)
      node.height = Math.round(height * this.pixelRatio)
      this.context = node.getContext('2d')
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
      this.context.strokeStyle = '#426fd2'
      this.context.fillStyle = '#426fd2'
      this.context.lineWidth = Math.max(8, Math.min(26, this.size * 0.035))
      this.context.lineCap = 'round'
      this.context.lineJoin = 'round'
      this.redraw()
    })
  },

  position(touch) {
    if (touch.x < 0 || touch.y < 0 || touch.x > this.size || touch.y > this.size) return null
    return { x: touch.x / this.size, y: touch.y / this.size }
  },

  paintSegment(from, to) {
    const ctx = this.context
    ctx.beginPath()
    if (from) {
      ctx.moveTo(from.x * this.size, from.y * this.size)
      ctx.lineTo(to.x * this.size, to.y * this.size)
      ctx.stroke()
    } else {
      ctx.arc(to.x * this.size, to.y * this.size, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  onTouchStart(event) {
    if (!this.context || this.activeStroke || event.touches.length !== 1) return
    this.stopDemonstration()
    const touch = event.touches[0]
    const point = this.position(touch)
    if (!point) return
    this.activeTouchId = touch.identifier
    this.activeStroke = [point]
    this.strokes.push(this.activeStroke)
    this.paintSegment(null, point)
    if (!this.data.hasInk) this.setData({ hasInk: true })
  },

  onTouchMove(event) {
    if (!this.activeStroke) return
    const touch = event.touches.find((item) => item.identifier === this.activeTouchId)
    if (!touch) return
    const point = this.position(touch)
    if (!point) {
      this.finishStroke()
      return
    }
    const previous = this.activeStroke[this.activeStroke.length - 1]
    if (point.x === previous.x && point.y === previous.y) return
    this.activeStroke.push(point)
    this.paintSegment(previous, point)
  },

  onTouchEnd(event) {
    if (!this.activeStroke) return
    const touch = event.changedTouches.find((item) => item.identifier === this.activeTouchId)
    if (!touch) return
    this.onTouchMove({ touches: [touch] })
    this.finishStroke()
  },

  finishStroke() {
    this.activeStroke = null
    this.activeTouchId = null
  },

  onTouchCancel() {
    this.finishStroke()
  },

  redraw() {
    if (!this.context) return
    this.context.clearRect(0, 0, this.size, this.size)
    this.strokes.forEach((stroke) => {
      stroke.forEach((point, index) => this.paintSegment(index ? stroke[index - 1] : null, point))
    })
  },

  undoStroke() {
    this.finishStroke()
    this.strokes.pop()
    this.redraw()
    this.setData({ hasInk: this.strokes.length > 0 })
  },

  clearWriting() {
    this.stopDemonstration()
    this.finishStroke()
    this.strokes = []
    this.redraw()
    this.setData({ hasInk: false })
  },

  selectCharacter(index) {
    if (index < 0 || index >= this.units.length) return
    this.index = index
    this.clearWriting()
    this.setData({ unit: this.units[index], guide: guideFor(this.units[index].title), currentNumber: index + 1, total: this.units.length,
      hasPrevious: index > 0, hasNext: index < this.units.length - 1 })
  },

  demonstrateFirstStroke() {
    const guide = this.data.guide
    if (!guide) return
    this.finishStroke()
    this.stopDemonstration()
    const started = Date.now()
    this.setData({ demonstrating: true, demoPoint: guide.start })
    this.demoTimer = setInterval(() => {
      const fraction = Math.min(1, (Date.now() - started) / 1800)
      this.setData({ demoPoint: pointAlong(guide.points, fraction) })
      if (fraction >= 1) this.stopDemonstration()
    }, 50)
  },

  stopDemonstration() {
    clearInterval(this.demoTimer)
    this.demoTimer = null
    if (this.data.demonstrating) this.setData({ demonstrating: false, demoPoint: null })
  },

  previousCharacter() {
    this.selectCharacter(this.index - 1)
  },

  nextCharacter() {
    this.selectCharacter(this.index + 1)
  },

  onResize() {
    this.stopDemonstration()
    this.finishStroke()
    this.updateViewport()
  },

  onHide() {
    this.stopDemonstration()
    this.finishStroke()
  },

  onUnload() {
    this.stopDemonstration()
    this.destroyed = true
    this.finishStroke()
    this.context = null
    this.canvas = null
    this.strokes = []
  }
})
