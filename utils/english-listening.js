const vocabulary = require('../data/english-vocabulary')

const KEY = 'curiocub-english-listening-v1'
const words = vocabulary.words.map(word => ({ id: word.id, title: word.word, phrase: word.meaning,
  topic: word.topic, image: word.image, audioFile: word.audioFile, legacyId: word.legacyId }))
const byId = new Map(words.map(word => [word.id, word]))
const legacyIds = new Map(words.filter(word => word.legacyId).map(word => [word.legacyId, word.id]))
const topics = [{ id: 'all', title: '混合练习' }, ...vocabulary.groups]
// Avoid choices whose pictures also contain the requested body part, person or object.
const overlaps = {
  head: ['hair', 'face', 'eye', 'ear', 'nose', 'mouth'], face: ['eye', 'nose', 'mouth'], leg: ['foot'],
  boy: ['mother', 'father', 'sister', 'brother', 'friend'], girl: ['sister', 'brother', 'friend'],
  sister: ['brother', 'friend'], brother: ['friend'], house: ['door', 'window'],
  book: ['desk', 'teacher'], sit: ['read', 'write', 'draw']
}

function topicWords(topic) {
  return topic === 'all' ? words : words.filter(word => word.topic === topic)
}

function shuffle(items) {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function createRound(topic, ids) {
  const pool = topicWords(topic)
  return shuffle(ids ? pool.filter(word => ids.includes(word.id)) : pool).slice(0, 5)
}

function optionsFor(word) {
  const others = shuffle(topicWords(word.topic).filter(unit => unit.id !== word.id
    && !(overlaps[word.id] || []).includes(unit.id) && !(overlaps[unit.id] || []).includes(word.id))).slice(0, 2)
  return shuffle([word, ...others]).map(unit => ({ id: unit.id,
    image: unit.image }))
}

function readState() {
  const saved = wx.getStorageSync(KEY) || {}
  const state = {}
  for (const [key, entry] of Object.entries(saved)) {
    const id = legacyIds.get(key) || key
    if (!byId.has(id) || (key !== id && saved[id])) continue
    state[id] = { ...entry, needsReview: entry.needsReview === undefined ? entry.lastFirstCorrect === false : entry.needsReview }
  }
  return state
}

function getReviewWords() {
  const state = readState()
  return words.filter(word => state[word.id] && state[word.id].needsReview)
    .sort((a, b) => (state[a.id].lastPracticedAt || 0) - (state[b.id].lastPracticedAt || 0))
}

function recordMiss(id) {
  id = legacyIds.get(id) || id
  if (!byId.has(id)) return
  const state = readState()
  state[id] = { ...(state[id] || { rounds: 0, firstCorrect: 0 }), needsReview: true, lastPracticedAt: Date.now() }
  wx.setStorageSync(KEY, state)
}

function recordAnswer(id, firstCorrect) {
  id = legacyIds.get(id) || id
  if (!byId.has(id)) return
  const state = readState()
  const previous = state[id] || { rounds: 0, firstCorrect: 0 }
  state[id] = { rounds: previous.rounds + 1, firstCorrect: previous.firstCorrect + Number(firstCorrect),
    lastFirstCorrect: firstCorrect, needsReview: !firstCorrect, lastPracticedAt: Date.now() }
  wx.setStorageSync(KEY, state)
}

module.exports = { topics, createRound, optionsFor, recordAnswer, recordMiss, getReviewWords }
