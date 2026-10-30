const { getProgress } = require('./progress')

const KEYS = ['curiocub-progress-v1', 'curiocub-hanzi-settings-v1', 'curiocub-practice-v1',
  'curiocub-english-listening-v1', 'curiocub-reading-tests-v1']
const UNDO_KEY = 'curiocub-before-import-v1'
const MAX_LENGTH = 1024 * 1024
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const check = (condition) => { if (!condition) throw new Error('存档内容不完整或格式不正确，请重新导出') }

// Detect truncated or accidentally edited text; this is not an authentication token.
function checksum(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}

function snapshot() {
  const data = {}
  KEYS.forEach(key => { data[key] = wx.getStorageSync(key) || null })
  const progress = getProgress()
  data[KEYS[0]] = { ...progress, lastModuleId: progress.lastModuleId || 'hanzi' }
  return data
}

function validate(data) {
  check(object(data) && Object.keys(data).length === KEYS.length && KEYS.every(key => key in data))
  const progress = data[KEYS[0]]
  check(object(progress))
  for (const field of ['completedIds', 'unlearnedIds', 'rewardedIds']) {
    check(object(progress[field]) && Object.values(progress[field]).every(value => value === true))
  }
  check(!Object.keys(progress.completedIds).some(id => progress.unlearnedIds[id]))
  check(Number.isSafeInteger(progress.stars) && progress.stars >= 0)
  check(Number.isSafeInteger(progress.stickerCount) && progress.stickerCount === Math.floor(progress.stars / 4))
  check(typeof progress.lastModuleId === 'string')
  const settings = data[KEYS[1]]
  if (settings !== null) {
    check(object(settings))
    if (settings.orderIds !== undefined) check(Array.isArray(settings.orderIds) && settings.orderIds.every(id => typeof id === 'string') && new Set(settings.orderIds).size === settings.orderIds.length)
    for (const field of ['autoRead', 'rangeEnabled']) if (settings[field] !== undefined) check(typeof settings[field] === 'boolean')
    for (const field of ['startId', 'endId']) if (settings[field] !== undefined) check(typeof settings[field] === 'string')
  }
  const practice = data[KEYS[2]]
  if (practice !== null) {
    check(object(practice) && ['days', 'readings', 'reviews'].every(key => object(practice[key])))
    for (const day of Object.values(practice.days)) {
      check(object(day) && typeof day.day === 'string' && Array.isArray(day.cards))
      check(typeof day.readingId === 'string' && typeof day.readingDone === 'boolean')
      check(day.cards.every(card => object(card) && typeof card.id === 'string' && typeof card.review === 'boolean' && typeof card.done === 'boolean'))
    }
    for (const field of ['readings', 'reviews']) check(Object.values(practice[field]).every(date => typeof date === 'string'))
  }
  const english = data[KEYS[3]]
  if (english !== null) {
    check(object(english))
    check(Object.values(english).every(entry => object(entry) && Number.isSafeInteger(entry.rounds) && entry.rounds >= 0 && Number.isSafeInteger(entry.firstCorrect) && entry.firstCorrect >= 0))
  }
  const tests = data[KEYS[4]]
  if (tests !== null) {
    check(object(tests))
    check(Object.values(tests).every(answers => object(answers) && Object.values(answers).every(answer => answer === 'independent' || answer === 'helped')))
  }
  return data
}

function encodeBackup(now = new Date()) {
  const payload = JSON.stringify({ createdAt: now.toISOString(), data: validate(snapshot()) })
  return JSON.stringify({ app: 'CurioCub', version: 1, checksum: checksum(payload), payload })
}

function decodeBackup(text) {
  check(typeof text === 'string' && text.length <= MAX_LENGTH)
  let envelope, payload
  try {
    envelope = JSON.parse(text.trim().replace(/^\uFEFF/, ''))
    check(envelope.app === 'CurioCub' && envelope.version === 1 && typeof envelope.payload === 'string')
    check(checksum(envelope.payload) === envelope.checksum)
    payload = JSON.parse(envelope.payload)
    check(object(payload) && typeof payload.createdAt === 'string' && Number.isFinite(Date.parse(payload.createdAt)))
    validate(payload.data)
  } catch (error) { throw new Error('无法读取这份存档，请选择完整的 CurioCub 学习存档') }
  return payload
}

function write(data) {
  KEYS.forEach(key => {
    if (data[key] === null) wx.removeStorageSync(key)
    else wx.setStorageSync(key, data[key])
  })
}

function restoreBackup(data, keepUndo = true) {
  validate(data)
  const before = snapshot()
  if (keepUndo) wx.setStorageSync(UNDO_KEY, before)
  try { write(data) } catch (error) {
    write(before)
    throw new Error('保存失败，本机记录已恢复，请检查设备存储空间')
  }
}

function undoImport() {
  const before = wx.getStorageSync(UNDO_KEY)
  if (!before) return false
  restoreBackup(before, false)
  wx.removeStorageSync(UNDO_KEY)
  return true
}

function describe(data) {
  const progress = data[KEYS[0]]
  return { learned: Object.keys(progress.completedIds).filter(id => id.startsWith('hanzi-')).length,
    notebook: Object.keys(progress.unlearnedIds).filter(id => id.startsWith('hanzi-')).length, stars: progress.stars }
}

module.exports = { encodeBackup, decodeBackup, restoreBackup, undoImport, describe, KEYS, UNDO_KEY, MAX_LENGTH }
