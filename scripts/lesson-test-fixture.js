// State/navigation checks use ready resources; check_lesson_buffer exercises real asynchronous loading.
const file = require.resolve('../utils/lesson-resources')
const ready = new Map()
function getPreparedUnit(unit) {
  if (!unit) return undefined
  if (!ready.has(unit.id)) ready.set(unit.id, { ...unit, resourceReady: true, fontFamily: 'TestKai' })
  return ready.get(unit.id)
}
require.cache[file] = { id: file, filename: file, loaded: true, exports: {
  getPreparedUnit,
  prepareUnit: unit => Promise.resolve(getPreparedUnit(unit)),
  prepareAhead: () => Promise.resolve()
} }

function readyAudio(player) {
  let source = player.src || ''
  player.onCanplay = function (callback) { this.readyListener = callback }
  player.offCanplay = function () { this.readyListener = null }
  Object.defineProperty(player, 'src', { configurable: true,
    get() { return source },
    set(value) { source = value; if (this.readyListener) this.readyListener() }
  })
  return player
}
module.exports = { readyAudio }
