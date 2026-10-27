const { getModule } = require('../data/learning')
const { defaultOrder } = require('../data/hanzi-school')
const STORAGE_KEY = 'curiocub-hanzi-settings-v1'

function orderedHanzi(settings) {
  const saved = settings || wx.getStorageSync(STORAGE_KEY) || {}
  const units = defaultOrder(getModule('hanzi').items)
  const byId = new Map(units.map(unit => [unit.id, unit]))
  const ids = [...new Set(Array.isArray(saved.orderIds) ? saved.orderIds : [])].filter(id => byId.has(id))
  const selected = new Set(ids)
  return ids.map(id => byId.get(id)).concat(units.filter(unit => !selected.has(unit.id)))
}

function getHanziSettings() {
  const saved = wx.getStorageSync(STORAGE_KEY) || {}
  const units = orderedHanzi(saved)
  const start = units.findIndex(unit => unit.id === saved.startId)
  const end = units.findIndex(unit => unit.id === saved.endId)
  return {
    autoRead: saved.autoRead !== false,
    rangeEnabled: saved.rangeEnabled === true && start >= 0 && end >= 0,
    startId: start >= 0 && end >= 0 ? units[Math.min(start, end)].id : units[0].id,
    endId: start >= 0 && end >= 0 ? units[Math.max(start, end)].id : units[Math.min(9, units.length - 1)].id,
    orderIds: Array.isArray(saved.orderIds) ? saved.orderIds : []
  }
}

function saveRange(startId, endId) {
  const units = orderedHanzi()
  const start = units.findIndex(unit => unit.id === startId)
  const end = units.findIndex(unit => unit.id === endId)
  if (start < 0 || end < start) return false
  wx.setStorageSync(STORAGE_KEY, { ...getHanziSettings(), rangeEnabled: true, startId, endId })
  return true
}

function exitRange() {
  wx.setStorageSync(STORAGE_KEY, { ...getHanziSettings(), rangeEnabled: false })
}

function setAutoRead(autoRead) {
  wx.setStorageSync(STORAGE_KEY, { ...getHanziSettings(), autoRead: Boolean(autoRead) })
}

function studyUnits(units, settings = getHanziSettings()) {
  const all = orderedHanzi(settings)
  const included = new Set(units.map(unit => unit.id))
  if (!settings.rangeEnabled) return all.filter(unit => included.has(unit.id))
  const start = all.findIndex(unit => unit.id === settings.startId)
  const end = all.findIndex(unit => unit.id === settings.endId)
  return all.slice(start, end + 1).filter(unit => included.has(unit.id))
}

function saveOrder(orderIds) {
  const ids = new Set(getModule('hanzi').items.map(unit => unit.id))
  if (!Array.isArray(orderIds) || (orderIds.length && (orderIds.length !== ids.size || new Set(orderIds).size !== ids.size || orderIds.some(id => !ids.has(id))))) return false
  wx.setStorageSync(STORAGE_KEY, { ...getHanziSettings(), orderIds })
  return true
}

module.exports = { getHanziSettings, saveRange, exitRange, setAutoRead, studyUnits, orderedHanzi, saveOrder }
