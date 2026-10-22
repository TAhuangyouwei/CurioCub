const { syllableExamples } = require('./pinyin-syllables')

const initials = [
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'
].map((value) => ({ value, label: value }))

const standardFinals = [
  { value: 'a', category: '单韵母' }, { value: 'o', category: '单韵母' },
  { value: 'e', category: '单韵母' }, { value: 'i', category: '单韵母' },
  { value: 'u', category: '单韵母' }, { value: 'ü', category: '单韵母' },
  { value: 'ai', category: '复韵母' }, { value: 'ei', category: '复韵母' },
  { value: 'ui', category: '复韵母' }, { value: 'ao', category: '复韵母' },
  { value: 'ou', category: '复韵母' }, { value: 'iu', category: '复韵母' },
  { value: 'ie', category: '复韵母' }, { value: 'üe', category: '复韵母' },
  { value: 'er', category: '特殊韵母' },
  { value: 'an', category: '前鼻韵母' }, { value: 'en', category: '前鼻韵母' },
  { value: 'in', category: '前鼻韵母' }, { value: 'un', category: '前鼻韵母' },
  { value: 'ün', category: '前鼻韵母' },
  { value: 'ang', category: '后鼻韵母' }, { value: 'eng', category: '后鼻韵母' },
  { value: 'ing', category: '后鼻韵母' }, { value: 'ong', category: '后鼻韵母' }
].map((item) => ({ ...item, label: item.value }))

const compoundFinals = ['ia', 'ua', 'uo', 'uai', 'iao', 'ian', 'iang', 'uan', 'uang', 'iong', 'üan']
  .map((value) => ({ value, label: value, category: '三拼音节' }))

const allFinals = standardFinals.concat(compoundFinals)
const medials = ['i', 'u', 'ü'].map((value) => ({ value, label: value }))
const threeEndings = ['a', 'o', 'e', 'ai', 'ao', 'an', 'ang', 'ong']
  .map((value) => ({ value, label: value }))

const wholeSyllables = [
  ['zhi', 'zhī', '知', 'zhi1'], ['chi', 'chī', '吃', 'chi1'],
  ['shi', 'shī', '师', 'shi1'], ['ri', 'rì', '日', 'ri4'],
  ['zi', 'zī', '资', 'zi1'], ['ci', 'cí', '词', 'ci2'],
  ['si', 'sī', '丝', 'si1'], ['yi', 'yī', '衣', 'yi1'],
  ['wu', 'wū', '乌', 'wu1'], ['yu', 'yū', '迂', 'yu1'],
  ['ye', 'yē', '椰', 'ye1'], ['yue', 'yuē', '约', 'yue1'],
  ['yuan', 'yuān', '冤', 'yuan1'], ['yin', 'yīn', '音', 'yin1'],
  ['yun', 'yūn', '晕', 'yun1'], ['ying', 'yīng', '英', 'ying1']
].map(([value, pinyin, character, audioKey]) => ({ value, label: value, pinyin, character, audioKey }))

const tones = [
  { value: 1, label: '一声', mark: '¯' }, { value: 2, label: '二声', mark: 'ˊ' },
  { value: 3, label: '三声', mark: 'ˇ' }, { value: 4, label: '四声', mark: 'ˋ' },
  { value: 5, label: '轻声', mark: '·' }
]

const ySpellings = {
  i: 'yi', ia: 'ya', ie: 'ye', iao: 'yao', iu: 'you', ian: 'yan', in: 'yin', iang: 'yang', ing: 'ying', iong: 'yong',
  ü: 'yu', üe: 'yue', üan: 'yuan', ün: 'yun',
  a: 'ya', o: 'yo', e: 'ye', ao: 'yao', ou: 'you', an: 'yan', ang: 'yang', ong: 'yong'
}

const wSpellings = {
  u: 'wu', a: 'wa', o: 'wo', ai: 'wai', ei: 'wei', an: 'wan', en: 'wen', ang: 'wang', eng: 'weng',
  ua: 'wa', uo: 'wo', uai: 'wai', ui: 'wei', uan: 'wan', uang: 'wang', un: 'wen'
}

const threeFinalMap = {
  'i+a': 'ia', 'i+e': 'ie', 'i+ao': 'iao', 'i+an': 'ian', 'i+ang': 'iang', 'i+ong': 'iong',
  'u+a': 'ua', 'u+o': 'uo', 'u+ai': 'uai', 'u+an': 'uan', 'u+ang': 'uang',
  'ü+e': 'üe', 'ü+an': 'üan'
}

function composeBase(initial, final) {
  if (!initial) return final
  if (initial === 'y') return ySpellings[final] || `${initial}${final}`
  if (initial === 'w') return wSpellings[final] || `${initial}${final}`
  if (['j', 'q', 'x'].includes(initial) && final.startsWith('ü')) {
    return `${initial}u${final.slice(1)}`
  }
  return `${initial}${final}`
}

function composeThreeFinal(medial, ending) {
  return threeFinalMap[`${medial}+${ending}`] || ''
}

function syllableKey(initial, final, tone) {
  return `${composeBase(initial, final).replace(/ü/g, 'v')}${tone}`
}

function getExample(initial, final, tone) {
  if (!final) return null
  const key = syllableKey(initial, final, tone)
  const character = syllableExamples[key]
  if (!character) return null
  return { key, base: composeBase(initial, final), character, tone }
}

function getAvailableFinals(initial) {
  return allFinals.map((final) => ({
    ...final,
    available: tones.some((tone) => Boolean(getExample(initial, final.value, tone.value)))
  }))
}

function getAvailableTones(initial, final) {
  return tones.map((tone) => ({
    ...tone,
    available: Boolean(getExample(initial, final, tone.value))
  }))
}

function getAvailableThreeEndings(initial, medial) {
  return threeEndings.map((ending) => {
    const final = composeThreeFinal(medial, ending.value)
    return {
      ...ending,
      available: Boolean(final) && tones.some((tone) => Boolean(getExample(initial, final, tone.value)))
    }
  })
}

function findFirstAvailableTone(initial, final) {
  const tone = getAvailableTones(initial, final).find((item) => item.available)
  return tone ? tone.value : 1
}

function formatPinyin(base, tone) {
  const plain = base.replace(/v/g, 'ü')
  if (tone === 5) return plain

  const marks = {
    a: ['ā', 'á', 'ǎ', 'à'], e: ['ē', 'é', 'ě', 'è'], i: ['ī', 'í', 'ǐ', 'ì'],
    o: ['ō', 'ó', 'ǒ', 'ò'], u: ['ū', 'ú', 'ǔ', 'ù'], ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
  }
  let index = plain.indexOf('a')
  if (index === -1) index = plain.indexOf('e')
  if (index === -1 && plain.includes('ou')) index = plain.indexOf('o')
  if (index === -1) {
    for (let cursor = plain.length - 1; cursor >= 0; cursor -= 1) {
      if (marks[plain[cursor]]) {
        index = cursor
        break
      }
    }
  }
  if (index === -1) return plain
  const vowel = plain[index]
  return `${plain.slice(0, index)}${marks[vowel][tone - 1]}${plain.slice(index + 1)}`
}

module.exports = {
  initials,
  standardFinals,
  medials,
  threeEndings,
  wholeSyllables,
  tones,
  composeBase,
  composeThreeFinal,
  getAvailableFinals,
  getAvailableTones,
  getAvailableThreeEndings,
  getExample,
  findFirstAvailableTone,
  formatPinyin
}
