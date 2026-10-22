let playbackVersion = 0
let errorHandler = null
let canPlayHandler = null
let endedHandler = null
let sequencePlayers = []

function getPlayer() {
  const app = getApp()
  return app && app.globalData && app.globalData.audio
}

function removeListeners(player) {
  if (errorHandler && player.offError) player.offError(errorHandler)
  if (canPlayHandler && player.offCanplay) player.offCanplay(canPlayHandler)
  if (endedHandler && player.offEnded) player.offEnded(endedHandler)
  errorHandler = null
  canPlayHandler = null
  endedHandler = null
}

function normalizeAudioSource(source) {
  if (typeof source === 'string') return { filePath: source, fallbackFilePath: '' }
  return source || { filePath: '', fallbackFilePath: '' }
}

function destroySequencePlayers() {
  sequencePlayers.forEach(({ player, onError, onCanplay, onEnded }) => {
    if (player.offError) player.offError(onError)
    if (player.offCanplay) player.offCanplay(onCanplay)
    if (player.offEnded) player.offEnded(onEnded)
    player.stop()
    if (player.destroy) player.destroy()
  })
  sequencePlayers = []
}

function stopAudio() {
  playbackVersion += 1
  destroySequencePlayers()
  const player = getPlayer()
  if (!player) return
  removeListeners(player)
  player.stop()
}

function playFile(player, source, currentVersion, onEnded) {
  const { filePath, fallbackFilePath } = normalizeAudioSource(source)
  let started = false
  removeListeners(player)
  player.stop()

  errorHandler = (error) => {
    if (currentVersion !== playbackVersion) return
    if (fallbackFilePath && fallbackFilePath !== filePath) {
      playFile(player, { filePath: fallbackFilePath }, currentVersion, onEnded)
      return
    }
    console.error('音频播放失败', filePath, error)
    wx.showToast({ title: '声音播放失败，请重新点击', icon: 'none' })
  }
  canPlayHandler = () => {
    if (started || currentVersion !== playbackVersion) return
    started = true
    player.play()
  }
  endedHandler = () => {
    if (currentVersion !== playbackVersion) return
    removeListeners(player)
    if (onEnded) onEnded()
  }
  player.onError(errorHandler)
  if (player.onCanplay) player.onCanplay(canPlayHandler)
  if (player.onEnded) player.onEnded(endedHandler)
  player.src = filePath

  started = true
  player.play()
}

function playAudioPath(filePath, fallbackFilePath = '') {
  const player = getPlayer()
  if (!player || !filePath) {
    wx.showToast({ title: '音频准备中，请稍后再试', icon: 'none' })
    return false
  }

  playbackVersion += 1
  destroySequencePlayers()
  playFile(player, { filePath, fallbackFilePath }, playbackVersion)
  return true
}

function playPreloadedSequence(sources) {
  const player = getPlayer()
  playbackVersion += 1
  const currentVersion = playbackVersion
  removeListeners(player)
  player.stop()
  destroySequencePlayers()

  const ready = sources.map(() => false)
  const played = sources.map(() => false)
  let activeIndex = 0

  const start = (index) => {
    if (currentVersion !== playbackVersion || played[index]) return
    played[index] = true
    sequencePlayers[index].player.play()
  }

  sources.forEach((source, index) => {
    const audio = normalizeAudioSource(source)
    const sequencePlayer = wx.createInnerAudioContext()
    sequencePlayer.obeyMuteSwitch = false

    const onError = (error) => {
      if (currentVersion !== playbackVersion) return
      if (audio.fallbackFilePath && sequencePlayer.src !== audio.fallbackFilePath) {
        sequencePlayer.src = audio.fallbackFilePath
        return
      }
      console.error('音频播放失败', sequencePlayer.src, error)
      wx.showToast({ title: '声音播放失败，请重新点击', icon: 'none' })
    }
    const onCanplay = () => {
      if (currentVersion !== playbackVersion) return
      ready[index] = true
      if (activeIndex === index) start(index)
    }
    const onEnded = () => {
      if (currentVersion !== playbackVersion) return
      if (index === sources.length - 1) {
        destroySequencePlayers()
        return
      }
      activeIndex = index + 1
      if (ready[activeIndex]) start(activeIndex)
    }

    sequencePlayer.onError(onError)
    sequencePlayer.onCanplay(onCanplay)
    sequencePlayer.onEnded(onEnded)
    sequencePlayers.push({ player: sequencePlayer, onError, onCanplay, onEnded })
    sequencePlayer.src = audio.filePath
  })

  return true
}

function playAudioSequence(filePaths) {
  const paths = (filePaths || []).map(normalizeAudioSource).filter((item) => item.filePath)
  const player = getPlayer()
  if (!player || !paths.length) {
    wx.showToast({ title: '音频准备中，请稍后再试', icon: 'none' })
    return false
  }

  if (paths.length > 1 && wx.createInnerAudioContext) {
    return playPreloadedSequence(paths)
  }

  playbackVersion += 1
  destroySequencePlayers()
  const currentVersion = playbackVersion
  let index = 0
  const playNext = () => {
    if (currentVersion !== playbackVersion) return
    if (index >= paths.length) {
      removeListeners(player)
      return
    }
    const filePath = paths[index]
    index += 1
    playFile(player, filePath, currentVersion, playNext)
  }
  playNext()
  return true
}

function playAudio(audioSource) {
  const audioFile = typeof audioSource === 'string' ? audioSource : audioSource && audioSource.audioFile
  return playAudioPath(audioFile ? (audioFile[0] === '/' ? audioFile : `/assets/audio/${audioFile}`) : '')
}

module.exports = { playAudio, playAudioPath, playAudioSequence, stopAudio }
