const { getProgress, getUnitStatus } = require('../../utils/progress')
const { getHanziSettings, saveRange, orderedHanzi } = require('../../utils/hanzi-settings')
const { startHanziLesson } = require('../../utils/start-lesson')

Page({
  data: { units: [], rangeStart: 0, rangeEnd: 0, rangeCount: 0, rangeReady: false, selecting: 'start', initialAnchor: '' },

  onLoad() {
    this.units = orderedHanzi()
    const progress = getProgress()
    const settings = getHanziSettings()
    const rangeStart = this.units.findIndex(unit => unit.id === settings.startId)
    const rangeEnd = this.units.findIndex(unit => unit.id === settings.endId)
    const labels = { unseen: '未学习', learned: '已学会', unlearned: '未学会' }
    this.setData({
      units: this.units.map(unit => {
        const status = getUnitStatus(unit.id, progress)
        return { id: unit.id, title: unit.title, status, statusLabel: labels[status] }
      }),
      rangeStart, rangeEnd, rangeCount: settings.rangeEnabled ? rangeEnd - rangeStart + 1 : 0,
      rangeReady: settings.rangeEnabled,
      initialAnchor: settings.rangeEnabled ? `char-${rangeStart}` : ''
    })
  },

  selectCharacter(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0 || index >= this.units.length) return
    if (this.data.selecting === 'start') {
      this.setData({ rangeStart: index, rangeEnd: index, rangeCount: 1, rangeReady: false, selecting: 'end' })
    } else {
      const rangeStart = Math.min(this.data.rangeStart, index)
      const rangeEnd = Math.max(this.data.rangeStart, index)
      this.setData({ rangeStart, rangeEnd, rangeCount: rangeEnd - rangeStart + 1, rangeReady: true, selecting: 'start' })
    }
  },

  saveAndStart() {
    if (!this.data.rangeReady) return
    const first = this.units[this.data.rangeStart]
    const last = this.units[this.data.rangeEnd]
    if (!saveRange(first.id, last.id)) return
    return startHanziLesson(this, first, '', true)
  }
})
