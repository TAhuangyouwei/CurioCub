const { getPinyinLocalAudio } = require('../data/pinyin-local-audio')
const { getPinyinBasicAudio } = require('../data/pinyin-basic-audio')
const { playAudioPath, playAudioSequence } = require('./audio')

function playLocalAudio(audio) {
  if (!audio) {
    wx.showToast({ title: '这个读音正在准备中', icon: 'none' })
    return false
  }
  return playAudioPath(audio.filePath)
}

function speakLocalPinyin(key) {
  return playLocalAudio(getPinyinLocalAudio(key))
}

function speakBasicPinyin(type, value) {
  return playLocalAudio(getPinyinBasicAudio(type, value))
}

function speakPinyinSequence(parts, key, tone) {
  const basicAudios = (parts || []).map((part) => (
    getPinyinBasicAudio(part.type, part.value, part.toned ? tone : 0)
  ))
  const resultAudio = getPinyinLocalAudio(key)
  if (basicAudios.some((audio) => !audio) || !resultAudio) {
    wx.showToast({ title: '这个读音正在准备中', icon: 'none' })
    return false
  }
  const paths = basicAudios.map((audio) => ({
    filePath: audio.filePath,
    fallbackFilePath: audio.fallbackFilePath
  })).concat({ filePath: resultAudio.filePath })
  return playAudioSequence(paths)
}

module.exports = { speakLocalPinyin, speakBasicPinyin, speakPinyinSequence }
