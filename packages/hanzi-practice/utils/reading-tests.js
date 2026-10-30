const { getModule } = require('../../../data/learning')
const { orderedHanzi } = require('../../../utils/hanzi-settings')
const { sentences, sentenceUnits } = require('../data/reading')
const KEY = 'curiocub-reading-tests-v1'

function readingTests(progress) {
  const units = orderedHanzi()
  const size = getModule('hanzi').groupSize
  const stations = Math.ceil(units.length / size)
  const state = wx.getStorageSync(KEY) || {}
  const tests = []
  const used = new Set()
  for (let first = 0; first < stations; first += 5) {
    const end = Math.min(first + 5, stations)
    const prefix = units.slice(0, end * size)
    const ids = new Set(prefix.map(unit => unit.id))
    const recent = new Set(units.slice(first * size, end * size).map(unit => unit.id))
    const unlocked = prefix.every(unit => progress.completedIds[unit.id])
    const overlap = sentence => new Set(sentenceUnits(sentence).filter(unit => recent.has(unit.id)).map(unit => unit.id)).size
    // Allocate deterministically, even for locked stages, so later completion never changes earlier tests.
    const candidates = sentences.filter(sentence => !used.has(sentence.id) && sentenceUnits(sentence).every(unit => unit && ids.has(unit.id)))
      .sort((a, b) => Number(overlap(b) > 0) - Number(overlap(a) > 0) ||
        Number(b.endStation === end) - Number(a.endStation === end) || overlap(b) - overlap(a))
    const selected = candidates.slice(0, 10)
    selected.forEach(sentence => used.add(sentence.id))
    // The prefix identities invalidate results when the family's learning order changes.
    const id = prefix.map(unit => unit.id).join(',')
    const answers = state[id] || {}
    tests.push({ id, firstStation: first + 1, endStation: end, title: `第 ${first + 1}～${end} 站`,
      unlocked, ready: selected.length === 10, sentences: selected,
      independent: selected.filter(sentence => answers[sentence.id] === 'independent').length,
      helped: selected.filter(sentence => answers[sentence.id] === 'helped').length, answers })
  }
  return tests
}

function recordAnswer(testId, sentenceId, answer) {
  if (answer !== 'independent' && answer !== 'helped') return
  const state = wx.getStorageSync(KEY) || {}
  state[testId] = { ...(state[testId] || {}), [sentenceId]: answer }
  wx.setStorageSync(KEY, state)
}

module.exports = { readingTests, recordAnswer }
