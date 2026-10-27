const { getModule } = require('../../../data/learning')
const { sentences, sentenceUnits, eligibleSentences } = require('../data/reading')
const KEY = 'curiocub-practice-v1'
const units = getModule('hanzi').items
function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function read() { return wx.getStorageSync(KEY) || { days: {}, readings: {}, reviews: {} } }
function save(state) {
  Object.keys(state.days).sort().slice(0, -30).forEach((key) => { delete state.days[key] })
  wx.setStorageSync(KEY, state)
}
function getToday(progress, day = todayKey()) {
  const state = read()
  if (!state.days[day]) {
    const target = sentences.find((sentence) => {
      const missing = sentenceUnits(sentence).filter((unit) => unit && !progress.completedIds[unit.id])
      return missing.length > 0 && missing.length <= 3 && sentenceUnits(sentence).every(Boolean)
    })
    const firstNew = target ? sentenceUnits(target).filter((unit) => !progress.completedIds[unit.id]) : []
    const foundation = [...'人上山下小鸟飞我有手水天日月一二三口'].map((char) => units.find((unit) => unit.title === char))
    const newUnits = [...new Set(firstNew.concat(foundation, units))].filter((unit) => !progress.completedIds[unit.id] && !progress.unlearnedIds[unit.id]).slice(0, 3)
    const review = units.filter((unit) => progress.unlearnedIds[unit.id] || progress.completedIds[unit.id])
      .sort((a, b) => Number(Boolean(progress.unlearnedIds[b.id])) - Number(Boolean(progress.unlearnedIds[a.id])) ||
        (state.reviews[a.id] || '').localeCompare(state.reviews[b.id] || '')).slice(0, 2)
    state.days[day] = { day, cards: review.map((unit) => ({ id: unit.id, review: true, done: false }))
      .concat(newUnits.map((unit) => ({ id: unit.id, review: false, done: false }))), readingId: '', readingDone: false }
    save(state)
  }
  return state.days[day]
}
function finishCard(session, id) {
  const state = read()
  const current = state.days[session.day]
  if (!current) return session
  current.cards.forEach((card) => { if (card.id === id) card.done = true })
  state.reviews[id] = session.day
  save(state)
  return current
}
function selectReading(progress, day = todayKey()) {
  getToday(progress, day)
  const state = read()
  const eligible = eligibleSentences(progress)
  const session = state.days[day]
  if (session.readingId) return eligible.find((sentence) => sentence.id === session.readingId) || null
  const newIds = new Set(session.cards.filter((card) => !card.review && card.done).map((card) => card.id))
  const overlap = (sentence) => sentenceUnits(sentence).filter((unit) => newIds.has(unit.id)).length
  const sentence = eligible.filter((item) => !state.readings[item.id]).sort((a, b) => overlap(b) - overlap(a))[0] || eligible.slice()
    .sort((a, b) => state.readings[a.id].localeCompare(state.readings[b.id]))[0]
  if (sentence) { session.readingId = sentence.id; save(state) }
  return sentence || null
}
function finishReading(id, day = todayKey()) {
  const state = read()
  state.readings[id] = day
  if (state.days[day] && state.days[day].readingId === id) state.days[day].readingDone = true
  save(state)
}
module.exports = { todayKey, getToday, finishCard, selectReading, finishReading }
