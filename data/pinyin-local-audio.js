const packageByInitial = {
  a: 'pinyin-01', b: 'pinyin-01',
  c: 'pinyin-02',
  d: 'pinyin-03', e: 'pinyin-03', f: 'pinyin-03',
  g: 'pinyin-04', h: 'pinyin-04',
  j: 'pinyin-05', k: 'pinyin-05',
  l: 'pinyin-06',
  m: 'pinyin-07', n: 'pinyin-07', o: 'pinyin-07',
  p: 'pinyin-08', q: 'pinyin-08',
  r: 'pinyin-09', s: 'pinyin-09',
  t: 'pinyin-10', w: 'pinyin-10',
  x: 'pinyin-11', y: 'pinyin-11',
  z: 'pinyin-12'
}

function getPinyinLocalAudio(key) {
  const packageName = packageByInitial[key && key[0]]
  if (!packageName) return null
  return {
    packageName,
    filePath: `/packages/${packageName}/audio/${key}.mp3`
  }
}

function getPinyinPackage(key) {
  const audio = getPinyinLocalAudio(key)
  return audio ? audio.packageName : ''
}

module.exports = { getPinyinLocalAudio, getPinyinPackage }
