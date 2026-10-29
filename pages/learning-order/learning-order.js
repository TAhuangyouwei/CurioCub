const { orderedHanzi, saveOrder } = require('../../utils/hanzi-settings')

Page({
  data: { units: [], selected: [], query: '', destinationId: '', destinationLabel: '',
    destinationVisible: false, destinationQuery: '', destinationResults: [] },
  onLoad() {
    this.units = orderedHanzi()
    this.selectedIds = []
    this.refresh()
  },
  refresh() {
    const selected = new Set(this.selectedIds)
    let destinationId = this.data.destinationId
    if (!selected.size || selected.has(destinationId)) destinationId = ''
    const targetIndex = this.units.findIndex(unit => unit.id === destinationId)
    const destinationLabel = destinationId === 'first' ? '最前面' : destinationId === 'last' ? '最后面'
      : targetIndex >= 0 ? `第 ${targetIndex + 1} 字「${this.units[targetIndex].title}」前面` : ''
    const query = this.data.destinationQuery
    this.setData({
      units: this.units.map((unit, index) => ({ id: unit.id, title: unit.title, number: index + 1,
        selected: selected.has(unit.id), hidden: Boolean(this.data.query && !this.data.query.includes(unit.title)) })),
      selected: this.selectedIds.map(id => this.units.find(unit => unit.id === id)),
      destinationId, destinationLabel,
      destinationResults: this.units.map((unit, index) => ({ id: unit.id, title: unit.title, number: index + 1 }))
        .filter(unit => !selected.has(unit.id) && (!query || query === String(unit.number) || query.includes(unit.title)))
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
  openDestination() {
    if (!this.selectedIds.length) return
    this.setData({ destinationVisible: true, destinationQuery: '' })
    this.refresh()
  },
  closeDestination() { this.setData({ destinationVisible: false }) },
  ignoreTap() {},
  searchDestination(event) { this.setData({ destinationQuery: event.detail.value.trim() }); this.refresh() },
  chooseDestination(event) {
    const id = event.currentTarget.dataset.id
    if (!this.selectedIds.length || this.selectedIds.includes(id)) return
    if (id !== 'first' && id !== 'last' && !this.units.some(unit => unit.id === id)) return
    this.setData({ destinationId: id, destinationVisible: false })
    this.refresh()
  },
  clearSelection() { this.selectedIds = []; this.refresh() },
  save() {
    const destinationId = this.data.destinationId
    if (!this.selectedIds.length || !destinationId) return
    const remaining = this.units.filter(unit => !this.selectedIds.includes(unit.id)).map(unit => unit.id)
    const index = destinationId === 'first' ? 0 : destinationId === 'last' ? remaining.length : remaining.indexOf(destinationId)
    if (index < 0) return
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
