const { orderedHanzi, saveOrder } = require('../../utils/hanzi-settings')

Page({
  data: { units: [], selected: [], query: '', destinations: [], destinationIndex: 0 },
  onLoad() {
    this.units = orderedHanzi()
    this.selectedIds = []
    this.refresh()
  },
  refresh() {
    const selected = new Set(this.selectedIds)
    const destinationId = this.data.destinations[this.data.destinationIndex] && this.data.destinations[this.data.destinationIndex].id
    const destinations = this.units.map((unit, index) => ({ id: unit.id, label: `${index + 1} · ${unit.title} 前面` })).filter(unit => !selected.has(unit.id))
    destinations.push({ id: '', label: '全部汉字最后面' })
    this.setData({
      units: this.units.map((unit, index) => ({ id: unit.id, title: unit.title, number: index + 1,
        selected: selected.has(unit.id), hidden: Boolean(this.data.query && !this.data.query.includes(unit.title)) })),
      selected: this.selectedIds.map(id => this.units.find(unit => unit.id === id)),
      destinations, destinationIndex: Math.max(0, destinations.findIndex(unit => unit.id === destinationId))
    })
  },
  search(event) { this.setData({ query: event.detail.value.trim() }); this.refresh() },
  toggleCharacter(event) {
    const id = event.currentTarget.dataset.id
    if (!this.units.some(unit => unit.id === id)) return
    if (this.selectedIds.includes(id)) this.selectedIds = this.selectedIds.filter(value => value !== id)
    else this.selectedIds.push(id)
    this.refresh()
  },
  changeDestination(event) { this.setData({ destinationIndex: Number(event.detail.value) }) },
  clearSelection() { this.selectedIds = []; this.refresh() },
  save() {
    if (!this.selectedIds.length) return
    const destination = this.data.destinations[this.data.destinationIndex]
    const remaining = this.units.filter(unit => !this.selectedIds.includes(unit.id)).map(unit => unit.id)
    const index = destination.id ? remaining.indexOf(destination.id) : remaining.length
    remaining.splice(index, 0, ...this.selectedIds)
    if (saveOrder(remaining)) {
      wx.showToast({ title: '顺序已保存', icon: 'success' })
      wx.navigateBack()
    }
  },
  restoreDefault() {
    wx.showModal({ title: '恢复默认顺序？', content: '恢复包含学校新字表的默认顺序，已学记录会保留。', success: result => {
      if (!result.confirm) return
      saveOrder([])
      this.units = orderedHanzi()
      this.selectedIds = []
      this.refresh()
      wx.showToast({ title: '已恢复默认顺序', icon: 'success' })
    } })
  }
})
