const { getHanziSettings } = require('./hanzi-settings')
const { playAudio, playAudioPath, stopAudio } = require('./audio')

function loadHanziPackage(name, success, fail) {
  if (!name || !wx.loadSubpackage) success()
  else wx.loadSubpackage({ name, success, fail })
}

// One pending reading per visible page; stop also cancels delayed readings.
function createHanziAudio(practice = false) {
  let timer = null
  let version = 0
  function stop() {
    clearTimeout(timer)
    timer = null
    version++
    stopAudio()
  }
  function start(unit, currentVersion) {
    if (version !== currentVersion) return
    // Lessons prepare resources before scheduling; practice audio belongs to its own page's package.
    if (practice) playAudioPath(`/packages/hanzi-practice/audio/${unit.id}.mp3`)
    else playAudio(unit.characterAudioFile)
  }
  return {
    stop,
    schedule(unit) {
      stop()
      if (!getHanziSettings().autoRead) return
      const currentVersion = version
      timer = setTimeout(() => { timer = null; start(unit, currentVersion) }, 350)
    },
    play(unit) {
      stop()
      start(unit, version)
    }
  }
}

module.exports = { createHanziAudio, loadHanziPackage }
