function normalize(value) {
  return String(value || '').replace(/ü/g, 'v')
}

function getPinyinBasicAudio(type, value, tone) {
  if (!['initial', 'final'].includes(type) || !value) return null
  const normalized = normalize(value)
  const toneSuffix = type === 'final' && tone >= 1 && tone <= 4 ? `-${tone}` : ''
  return {
    filePath: `/assets/audio/pinyin-basic/${type}-${normalized}${toneSuffix}.mp3`,
    fallbackFilePath: `/assets/audio/pinyin-basic/${type}-${normalized}.mp3`
  }
}

module.exports = { getPinyinBasicAudio }
