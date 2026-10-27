const { getModule } = require('../data/learning')
const STORAGE_KEY = 'curiocub-hanzi-settings-v1'

function getHanziSettings() {
  const saved = wx.getStorageSync(STORAGE_KEY) || {}
  const units = getModule('hanzi').items
  const start = units.findIndex(unit => unit.id === saved.startId)
  const end = units.findIndex(unit => unit.id === saved.endId)
  return {
    autoRead: saved.autoRead !== false,
    rangeEnabled: saved.rangeEnabled === true && start >= 0 && end >= start,
    startId: start >= 0 ? saved.startId : units[0].id,
    endId: end >= 0 ? saved.endId : units[Math.min(9, units.length - 1)].id
  }
}

function saveRange(startId, endId) {
  const units = getModule('hanzi').items
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
  if (!settings.rangeEnabled) return units
  const all = getModule('hanzi').items
  const start = all.findIndex(unit => unit.id === settings.startId)
  const end = all.findIndex(unit => unit.id === settings.endId)
  const allowed = new Set(all.slice(start, end + 1).map(unit => unit.id))
  return units.filter(unit => allowed.has(unit.id))
}

module.exports = { getHanziSettings, saveRange, exitRange, setAutoRead, studyUnits }
