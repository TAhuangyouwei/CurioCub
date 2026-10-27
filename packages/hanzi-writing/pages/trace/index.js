const { getModule } = require('../../../../data/learning')
const { getHanziSettings, studyUnits, setAutoRead } = require('../../../../utils/hanzi-settings')
const { createHanziAudio, loadHanziPackage } = require('../../../../utils/hanzi-audio')
const { guideFor, pointAlong, matchesStroke } = require('../../utils/stroke-guide')

Page({
  data: {
    unit: null, boardSize: 0, windowHeight: 0, bottomInset: 12,
    currentNumber: 1, total: 0, hasInk: false, hasPrevious: false, hasNext: false,
    guide: null, strokeNumber: 1, strokeCount: 0, complete: false,
    demonstrating: false, demoPoint: null, feedback: '',
    rangeEnabled: false, autoRead: true, hintVisible: false, hintImage: '', hintLoading: false
  },

  onLoad(options) {
    const settings = getHanziSettings()
    this.units = studyUnits(getModule('hanzi').items, settings)
    let index = this.units.findIndex(unit => unit.id === options.unitId)
    if (index === -1 && !settings.rangeEnabled) {
      wx.reLaunch({ url: '/pages/module/module?moduleId=hanzi' })
      return
    }
    if (index === -1) index = 0
    this.audio = createHanziAudio(true)
    this.strokes = []
    this.setData({ rangeEnabled: settings.rangeEnabled, autoRead: settings.autoRead })
    this.selectCharacter(index)
    this.updateViewport()
  },

  onShow() {
    this.setData({ autoRead: getHanziSettings().autoRead })
    if (this.wasHidden && this.data.unit) this.audio.schedule(this.data.unit)
    this.wasHidden = false
  },

  onReady() {
    if (this.data.unit) this.prepareCanvas()
  },

  updateViewport() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const bottomInset = Math.max(12, info.safeArea ? info.screenHeight - info.safeArea.bottom : 0)
    const boardSize = Math.floor(Math.min(info.windowWidth - 24, info.windowHeight - 280 - bottomInset))
    this.pixelRatio = info.pixelRatio
    this.setData({ boardSize, windowHeight: info.windowHeight, bottomInset }, () => {
      if (this.canvas) this.prepareCanvas()
    })
  },

  prepareCanvas() {
    if (this.destroyed || this.data.hintVisible) return
    wx.createSelectorQuery().in(this).select('#trace-canvas').fields({ node: true, size: true }).exec(results => {
      if (this.destroyed || this.data.hintVisible || !results[0]) return
      const { node, width, height } = results[0]
      this.canvas = node
      this.size = width
      node.width = Math.round(width * this.pixelRatio)
      node.height = Math.round(height * this.pixelRatio)
      this.context = node.getContext('2d')
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
      this.context.lineWidth = Math.max(8, Math.min(26, this.size * 0.035))
      this.context.lineCap = 'round'
      this.context.lineJoin = 'round'
      this.redraw()
    })
  },

  drawOutline(stroke, color) {
    const ctx = this.context
    ctx.fillStyle = color
    ctx.beginPath()
    for (const [command, ...values] of stroke.commands) {
      const args = values.map(value => value / 1000 * this.size)
      if (command === 251) ctx.moveTo(...args)
      else if (command === 252) ctx.lineTo(...args)
      else if (command === 253) ctx.quadraticCurveTo(...args)
      else if (command === 254) ctx.bezierCurveTo(...args)
      else ctx.closePath()
    }
    ctx.fill()
  },

  paintSegment(from, to) {
    const ctx = this.context
    ctx.fillStyle = '#426fd2'
    ctx.strokeStyle = '#426fd2'
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

  redraw() {
    if (!this.context || !this.characterGuide) return
    this.context.clearRect(0, 0, this.size, this.size)
    const active = this.data.demonstrating ? this.demoStrokeIndex : this.strokes.length
    this.characterGuide.strokes.forEach((stroke, index) => {
      const done = this.demoMode === 'all' ? index < active : index < this.strokes.length
      this.drawOutline(stroke, index === active ? '#f4bc6d' : done ? '#b0d8e9' : '#e1e5eb')
    })
    this.strokes.forEach(stroke => stroke.forEach((point, index) => this.paintSegment(index ? stroke[index - 1] : null, point)))
  },

  position(touch) {
    if (touch.x < 0 || touch.y < 0 || touch.x > this.size || touch.y > this.size) return null
    return { x: touch.x / this.size, y: touch.y / this.size }
  },

  onTouchStart(event) {
    if (!this.context || this.activeStroke || this.data.complete || this.data.hintVisible || event.touches.length !== 1) return
    this.stopDemonstration()
    const touch = event.touches[0]
    const point = this.position(touch)
    if (!point) return
    this.activeTouchId = touch.identifier
    this.activeStroke = [point]
    this.paintSegment(null, point)
  },

  onTouchMove(event) {
    if (!this.activeStroke) return
    if (event.touches.length > 1) { this.discardStroke(); return }
    const touch = event.touches.find(item => item.identifier === this.activeTouchId)
    if (!touch) return
    const point = this.position(touch)
    if (!point) { this.rejectStroke(); return }
    const previous = this.activeStroke[this.activeStroke.length - 1]
    if (point.x === previous.x && point.y === previous.y) return
    this.activeStroke.push(point)
    this.paintSegment(previous, point)
  },

  onTouchEnd(event) {
    if (!this.activeStroke) return
    const touch = event.changedTouches.find(item => item.identifier === this.activeTouchId)
    if (!touch) return
    this.onTouchMove({ touches: [touch] })
    if (!this.activeStroke) return
    const stroke = this.characterGuide.strokes[this.strokes.length]
    if (!matchesStroke(this.activeStroke, stroke.points)) { this.rejectStroke(); return }
    this.strokes.push(this.activeStroke)
    this.activeStroke = null
    this.activeTouchId = null
    this.refreshWriting(this.strokes.length === this.characterGuide.count ? '真棒！这个字写好啦，想继续就换下一字吧！' : '写对啦！沿绿点继续写下一笔')
  },

  discardStroke() {
    this.activeStroke = null
    this.activeTouchId = null
    this.redraw()
  },

  rejectStroke() {
    this.discardStroke()
    this.demonstrateCurrent()
    this.setData({ feedback: '没关系，看一遍，再从绿点沿箭头写一笔' })
  },

  onTouchCancel() { this.discardStroke() },

  refreshWriting(message) {
    const next = this.characterGuide.strokes[this.strokes.length]
    this.setData({
      guide: next ? { start: next.start, angle: next.angle } : null,
      strokeNumber: Math.min(this.strokes.length + 1, this.characterGuide.count),
      strokeCount: this.characterGuide.count,
      hasInk: this.strokes.length > 0,
      complete: !next,
      feedback: message || (next ? '从绿点起笔，沿箭头描亮色的这一笔' : '真棒！这个字写好啦！')
    })
    this.redraw()
  },

  undoStroke() {
    this.stopDemonstration()
    this.discardStroke()
    this.strokes.pop()
    this.refreshWriting()
  },

  clearWriting() {
    this.stopDemonstration()
    this.discardStroke()
    this.strokes = []
    this.refreshWriting()
  },

  selectCharacter(index) {
    if (this.data.rangeEnabled) index = (index + this.units.length) % this.units.length
    if (index < 0 || index >= this.units.length) return
    this.stopDemonstration()
    this.activeStroke = null
    this.activeTouchId = null
    this.index = index
    this.strokes = []
    this.characterGuide = guideFor(this.units[index].title)
    const restoreCanvas = this.data.hintVisible
    this.setData({ unit: this.units[index], currentNumber: index + 1, total: this.units.length,
      hasPrevious: this.data.rangeEnabled ? this.units.length > 1 : index > 0,
      hasNext: this.data.rangeEnabled ? this.units.length > 1 : index < this.units.length - 1,
      hintVisible: false, hintImage: '', hintLoading: false }, () => {
      if (restoreCanvas) this.prepareCanvas()
    })
    this.refreshWriting()
    this.audio.schedule(this.data.unit)
  },

  demonstrateAll() { this.startDemonstration(true) },
  demonstrateCurrent() { this.startDemonstration(false) },

  startDemonstration(all) {
    if (!all && this.data.complete) return
    this.stopDemonstration()
    this.discardStroke()
    this.demoMode = all ? 'all' : 'current'
    const first = all ? 0 : this.strokes.length
    const started = Date.now()
    const tick = () => {
      const elapsed = Date.now() - started
      const index = first + (all ? Math.floor(elapsed / 1400) : 0)
      if ((all && index >= this.characterGuide.count) || (!all && elapsed >= 1400)) {
        this.stopDemonstration()
        return
      }
      this.demoStrokeIndex = index
      const stroke = this.characterGuide.strokes[index]
      this.setData({ demonstrating: true, strokeNumber: index + 1,
        guide: { start: stroke.start, angle: stroke.angle },
        demoPoint: pointAlong(stroke.points, Math.min(1, (elapsed % 1400) / 1100)),
        feedback: all ? '看一看每一笔的顺序，再自己试试吧' : '从绿点起笔，跟着小圆点的方向写' })
      this.redraw()
    }
    tick()
    this.demoTimer = setInterval(tick, 50)
  },

  stopDemonstration() {
    clearInterval(this.demoTimer)
    this.demoTimer = null
    this.demoMode = null
    if (this.data.demonstrating) {
      this.setData({ demonstrating: false, demoPoint: null })
      this.refreshWriting()
    }
  },

  showHint() {
    this.stopDemonstration()
    this.discardStroke()
    this.context = null
    this.canvas = null
    const unit = this.data.unit
    this.setData({ hintVisible: true, hintLoading: true, hintImage: '' })
    loadHanziPackage(unit.packageName, () => {
      if (this.destroyed || !this.data.hintVisible || this.data.unit.id !== unit.id) return
      this.setData({ hintLoading: false, hintImage: unit.imageFile })
    }, () => {
      if (!this.destroyed && this.data.unit.id === unit.id) this.setData({ hintLoading: false })
    })
  },
  closeHint() { this.setData({ hintVisible: false }, () => this.prepareCanvas()) },
  onHintImageError() { this.setData({ hintImage: '' }) },
  ignoreTouch() {},
  playCharacter() { this.audio.play(this.data.unit) },
  changeAutoRead(event) {
    setAutoRead(event.detail.value)
    this.setData({ autoRead: event.detail.value })
    if (event.detail.value) this.audio.schedule(this.data.unit)
    else this.audio.stop()
  },
  previousCharacter() { this.selectCharacter(this.index - 1) },
  nextCharacter() { this.selectCharacter(this.index + 1) },
  onSwipeStart(event) {
    if (!this.data.hintVisible && event.touches.length === 1) this.swipeStart = event.touches[0]
  },
  onSwipeEnd(event) {
    const start = this.swipeStart
    this.swipeStart = null
    const end = event.changedTouches[0]
    if (!start || !end || this.data.hintVisible) return
    const dx = end.clientX - start.clientX
    if (Math.abs(dx) > 70 && Math.abs(end.clientY - start.clientY) < 50) {
      if (dx > 0) this.previousCharacter()
      else this.nextCharacter()
    }
  },
  onResize() {
    this.stopDemonstration()
    this.discardStroke()
    this.updateViewport()
  },
  onHide() {
    this.wasHidden = true
    if (this.audio) this.audio.stop()
    this.stopDemonstration()
    this.discardStroke()
    this.swipeStart = null
  },
  onUnload() {
    this.onHide()
    this.destroyed = true
    this.context = null
    this.canvas = null
    this.strokes = []
  }
})
