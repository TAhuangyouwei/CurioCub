const { getModule } = require('../../../../data/learning')
const { playAudio, stopAudio } = require('../../../../utils/audio')
const { guideFor, pointAt, matchesStroke } = require('../../data/writing')

Page({
  data: { unit: null, index: 0, total: 0, boardWidth: 0, boardHeight: 0,
    strokeNumber: 1, strokeCount: 0, strokeName: '', position: '', demonstrating: false, hasInk: false, complete: false, feedback: '' },
  onLoad(options) {
    this.units = getModule('pinyin').items
    const index = this.units.findIndex(unit => unit.id === options.unitId)
    if (index < 0) { wx.redirectTo({ url: '/pages/module/module?moduleId=pinyin' }); return }
    this.ink = []
    this.select(index)
    this.updateSize()
  },
  onReady() { this.ready = true; if (this.data.unit) this.prepareCanvas() },
  updateSize() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.pixelRatio = info.pixelRatio || 1
    this.setData({ boardWidth: Math.min(900, info.windowWidth - 32), boardHeight: Math.max(170, Math.min(340, info.windowHeight - 350)) })
  },
  onResize() { this.stopDemo(); this.cancelInk(); this.updateSize(); if (this.ready) this.prepareCanvas() },
  prepareCanvas() {
    wx.createSelectorQuery().in(this).select('#pinyin-canvas').fields({ node: true, size: true }).exec(results => {
      if (this.destroyed || !results[0]) return
      const { node, width, height } = results[0]
      this.canvas = node
      this.width = width; this.height = height
      node.width = Math.round(width * this.pixelRatio); node.height = Math.round(height * this.pixelRatio)
      this.ctx = node.getContext('2d')
      this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
      this.redraw()
    })
  },
  select(index) {
    this.stopDemo()
    this.guide = guideFor(this.units[index].title)
    this.strokeIndex = 0
    this.ink = []
    this.activeInk = null
    this.activeTouchId = null
    this.setData({ unit: this.units[index], index, total: this.units.length, position: this.guide.position,
      strokeNumber: 1, strokeCount: this.guide.strokes.length, strokeName: this.name(), hasInk: false, complete: false,
      feedback: '从绿点起笔，沿箭头描亮色的这一笔' })
    if (this.ctx) this.redraw()
  },
  name() {
    const stroke = this.guide.strokes[this.strokeIndex]
    return `${stroke.letter === 'a' ? 'ɑ' : stroke.letter === 'g' ? 'ɡ' : stroke.letter} · ${stroke.name}`
  },
  transform() {
    const scale = Math.min((this.width - 48) / this.guide.width, (this.height - 42) / 120)
    return { scale, left: (this.width - this.guide.width * scale) / 2, top: (this.height - 120 * scale) / 2 }
  },
  drawPath(points, color, weight = 5) {
    if (!points.length) return
    const { scale, left, top } = this.transform()
    const ctx = this.ctx
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, weight * scale)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (points.length === 1) {
      ctx.fillStyle = color
      ctx.arc(left + points[0][0] * scale, top + points[0][1] * scale, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill(); return
    }
    points.forEach(([x, y], index) => { if (!index) ctx.moveTo(left + x * scale, top + y * scale); else ctx.lineTo(left + x * scale, top + y * scale) })
    ctx.stroke()
  },
  redraw(fraction) {
    if (!this.ctx || !this.guide) return
    const ctx = this.ctx
    const { scale, left, top } = this.transform()
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, this.width, this.height)
    for (let line = 0; line < 4; line++) {
      ctx.beginPath(); ctx.strokeStyle = line === 1 || line === 2 ? '#d49b9e' : '#c3cbd4'; ctx.lineWidth = 1
      ctx.moveTo(12, top + line * 40 * scale); ctx.lineTo(this.width - 12, top + line * 40 * scale); ctx.stroke()
    }
    this.guide.strokes.forEach((stroke, index) => this.drawPath(stroke.points, index < this.strokeIndex ? '#90b4a8' : '#d9dfe5'))
    const active = this.guide.strokes[this.strokeIndex]
    if (active) {
      const points = fraction === undefined ? active.points : Array.from({ length: 61 }, (_, i) => pointAt(active.points, fraction * i / 60))
      this.drawPath(points, '#c94f52')
    }
    this.ink.forEach(points => this.drawPath(points, '#365e97', 4))
    if (this.activeInk) this.drawPath(this.activeInk, '#365e97', 4)
    if (!active) return
    // A numbered start and a direction arrow stay visible while tracing.
    const start = active.points[0]
    const end = fraction === undefined ? pointAt(active.points, 0.35) : pointAt(active.points, fraction)
    const before = pointAt(active.points, Math.max(0, (fraction === undefined ? 0.35 : fraction) - 0.08))
    const angle = Math.atan2(end[1] - before[1], end[0] - before[0])
    const x = left + end[0] * scale, y = top + end[1] * scale
    ctx.strokeStyle = '#c94f52'; ctx.lineWidth = 2; ctx.beginPath()
    ctx.moveTo(x - 9 * Math.cos(angle - 0.55), y - 9 * Math.sin(angle - 0.55)); ctx.lineTo(x, y)
    ctx.lineTo(x - 9 * Math.cos(angle + 0.55), y - 9 * Math.sin(angle + 0.55)); ctx.stroke()
    ctx.fillStyle = '#278765'; ctx.beginPath(); ctx.arc(left + start[0] * scale, top + start[1] * scale, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#c94f52'
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(this.strokeIndex + 1), left + start[0] * scale, top + start[1] * scale - 10)
  },
  demonstrate() {
    if (!this.ctx || this.data.complete) return
    this.stopDemo()
    this.activeInk = null; this.activeTouchId = null
    this.setData({ demonstrating: true, hasInk: this.ink.length > 0 })
    let frame = 0, pause = 0
    const tick = () => {
      if (this.destroyed || !this.data.demonstrating) return
      this.redraw(Math.min(1, frame / 30))
      if (frame < 30) frame++
      else if (++pause > 10) {
        this.stopDemo(); this.redraw(); return
      }
      this.timer = setTimeout(tick, 24)
    }
    tick()
  },
  stopDemo() { clearTimeout(this.timer); this.timer = null; this.setData({ demonstrating: false }) },
  touchPoint(touch) {
    if (!touch || !this.ctx || !Number.isFinite(touch.x) || !Number.isFinite(touch.y) || touch.x < 0 || touch.y < 0 || touch.x > this.width || touch.y > this.height) return null
    const { scale, left, top } = this.transform()
    return [(touch.x - left) / scale, (touch.y - top) / scale]
  },
  startInk(event) {
    if (this.data.complete || this.activeInk || event.touches.length !== 1) return
    const touch = event.touches[0]
    const point = this.touchPoint(touch)
    if (!point) return
    this.stopDemo(); this.activeTouchId = touch.identifier; this.activeInk = [point]
    this.setData({ hasInk: true }); this.redraw()
  },
  moveInk(event) {
    if (!this.activeInk) return
    if (event.touches.length !== 1) { this.cancelInk(); return }
    const touch = event.touches.find(touch => touch.identifier === this.activeTouchId)
    if (!touch) return
    const point = this.touchPoint(touch)
    if (!point) { this.rejectInk(); return }
    const last = this.activeInk[this.activeInk.length - 1]
    if (point[0] === last[0] && point[1] === last[1]) return
    this.activeInk.push(point); this.redraw()
  },
  endInk(event) {
    if (!this.activeInk) return
    const touch = event.changedTouches && event.changedTouches.find(touch => touch.identifier === this.activeTouchId)
    if (!touch) return
    this.moveInk({ touches: [touch] })
    if (!this.activeInk) return
    if (!matchesStroke(this.activeInk, this.guide.strokes[this.strokeIndex].points)) { this.rejectInk(); return }
    this.ink.push(this.activeInk); this.activeInk = null; this.activeTouchId = null
    this.refreshWriting(this.ink.length === this.guide.strokes.length ? '真棒！这个拼音描好啦！' : '写对啦！从绿点继续描下一笔')
  },
  cancelInk() { this.activeInk = null; this.activeTouchId = null; this.setData({ hasInk: this.ink.length > 0 }); this.redraw() },
  rejectInk() { this.cancelInk(); this.setData({ feedback: '没关系，看这一笔的提示，再从绿点描一次' }); this.demonstrate() },
  refreshWriting(feedback) {
    this.strokeIndex = this.ink.length
    const complete = this.strokeIndex === this.guide.strokes.length
    this.setData({ complete, hasInk: this.ink.length > 0, strokeNumber: Math.min(this.strokeIndex + 1, this.guide.strokes.length),
      strokeName: complete ? '' : this.name(), feedback: feedback || '从绿点起笔，沿箭头描亮色的这一笔' })
    this.redraw()
  },
  undoStroke() { this.stopDemo(); this.cancelInk(); this.ink.pop(); this.refreshWriting() },
  clearInk() { this.stopDemo(); this.cancelInk(); this.ink = []; this.refreshWriting() },
  previous() { if (this.data.index > 0) this.select(this.data.index - 1) },
  next() { if (this.data.index < this.units.length - 1) this.select(this.data.index + 1) },
  play() { playAudio(this.data.unit.audioFile) },
  onHide() { this.stopDemo(); this.cancelInk(); stopAudio() },
  onUnload() { this.destroyed = true; this.onHide() }
})
