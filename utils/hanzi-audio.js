const { getHanziSettings } = require('./hanzi-settings')
const { playAudio, playAudioPath, stopAudio } = require('./audio')

function loadHanziPackage(name, success, fail) {
  if (!name || !wx.loadSubpackage) success()
  else wx.loadSubpackage({ name, success, fail })
}

// One pending reading per visible page. Delayed package callbacks also expire on stop.
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
    loadHanziPackage(practice ? 'hanzi-practice' : unit.packageName, () => {
      if (version !== currentVersion) return
      if (practice) playAudioPath(`/packages/hanzi-practice/audio/${unit.id}.mp3`)
      else playAudio(unit.characterAudioFile)
    }, () => {
      if (version === currentVersion) wx.showToast({ title: '声音加载失败，点喇叭再试试', icon: 'none' })
    })
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
