const { initials, standardFinals, wholeSyllables } = require('./pinyin-builder')

// Keep the first twelve identities used by existing family saves.
const original = [
  ['a', '张开嘴巴 a', '😮'], ['o', '圆圆嘴巴 o', '🟡'], ['e', '白鹅 e', '🐤'],
  ['i', '衣服 i', '👕'], ['u', '乌鸦 u', '🐦'], ['ü', '小鱼 ü', '🐟'],
  ['b', '广播 b', '📻'], ['p', '泼水 p', '💦'], ['m', '两个门洞 m', '🚪'],
  ['f', '一根拐杖 f', '🏒'], ['d', '小鼓 d', '🥁'], ['t', '小雨伞 t', '☂️']
]
const entries = initials.map(item => ({ title: item.value, type: 'initial', category: '声母' }))
  .concat(standardFinals.map(item => ({ title: item.value, type: 'final', category: '韵母' })),
    wholeSyllables.map(item => ({ title: item.value, type: 'whole', category: '整体认读音节', audioKey: item.audioKey })))
const existing = new Set(original.map(row => row[0]))
const seeds = original.concat(entries.filter(item => !existing.has(item.title)).map(item => [item.title, `${item.category} ${item.title}`, '🔤']))
const { getPinyinBasicAudio } = require('./pinyin-basic-audio')

function preparePinyin(items) {
  return entries.map(entry => {
    const unit = items.find(item => item.title === entry.title)
    return { ...unit, ...entry, displayTitle: entry.title.replace(/a/g, 'ɑ').replace(/g/g, 'ɡ'),
      audioFile: entry.type === 'whole' ? `/assets/audio/pinyin-basic/whole-${entry.title}.mp3` : getPinyinBasicAudio(entry.type, entry.title).filePath }
  })
}

module.exports = { seeds, preparePinyin }
