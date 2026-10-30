const { getModule } = require('../../../data/learning')

// Original short sentences. Pinyin follows the sentence, including neutral tones.
const seeds = [
  ['人上山。', 'rén shàng shān', '⛰️'],
  ['人下山。', 'rén xià shān', '⛰️'],
  ['小鸟飞。', 'xiǎo niǎo fēi', '🐦'],
  ['我有小手。', 'wǒ yǒu xiǎo shǒu', '🖐️'],
  ['山上有小鸟。', 'shān shàng yǒu xiǎo niǎo', '🐦'],
  ['小鱼在水里。', 'xiǎo yú zài shuǐ lǐ', '🐟'],
  ['天上有云。', 'tiān shàng yǒu yún', '☁️'],
  ['小猫来了。', 'xiǎo māo lái le', '🐱'],
  ['小狗跑来了。', 'xiǎo gǒu pǎo lái le', '🐶'],
  ['我看见小鸟。', 'wǒ kàn jiàn xiǎo niǎo', '🐦'],
  ['月亮出来了。', 'yuè liang chū lái le', '🌙'],
  ['太阳出来了。', 'tài yáng chū lái le', '☀️'],
  ['小花开了。', 'xiǎo huā kāi le', '🌸'],
  ['树上有花。', 'shù shàng yǒu huā', '🌳'],
  ['树下有小猫。', 'shù xià yǒu xiǎo māo', '🐱'],
  ['妈妈开门。', 'mā ma kāi mén', '🚪'],
  ['我来关门。', 'wǒ lái guān mén', '🚪'],
  ['奶奶来了。', 'nǎi nai lái le', '😊'],
  ['小手洗一洗。', 'xiǎo shǒu xǐ yi xǐ', '💧'],
  ['小鸟有翅膀。', 'xiǎo niǎo yǒu chì bǎng', '🐦'],
  ['我看小猫。', 'wǒ kàn xiǎo māo', '🐱'],
  ['小兔在吃草。', 'xiǎo tù zài chī cǎo', '🐰'],
  ['小牛吃草。', 'xiǎo niú chī cǎo', '🐮'],
  ['小羊上山吃草。', 'xiǎo yáng shàng shān chī cǎo', '🐑'],
  ['秋天树叶落了。', 'qiū tiān shù yè luò le', '🍂'],
  ['小雨落下来了。', 'xiǎo yǔ luò xià lái le', '🌧️'],
  ['小手拉小手。', 'xiǎo shǒu lā xiǎo shǒu', '🤝'],
  ['小猫看月亮。', 'xiǎo māo kàn yuè liang', '🌙'],
  ['小鸟在家里。', 'xiǎo niǎo zài jiā lǐ', '🏡'],
  ['我跟妈妈上山。', 'wǒ gēn mā ma shàng shān', '⛰️']
]

const sentences = seeds.map(([text, pinyin, icon], index) => ({
  id: `sentence-${String(index + 1).padStart(2, '0')}`, text, pinyin: pinyin.split(' '), icon,
  audio: `/packages/hanzi-practice/audio/sentence-${String(index + 1).padStart(2, '0')}.mp3`
}))
require('./reading-stages').forEach(([endStation, lines], group) => {
  lines.forEach(([text, pinyin], index) => {
    const id = `test-${group + 1}-${index + 1}`
    sentences.push({ id, text, pinyin: pinyin.split(' '), icon: '📖', endStation,
      audio: `/packages/hanzi-practice/audio/${id}.mp3` })
  })
})
const units = getModule('hanzi').items
const byTitle = Object.fromEntries(units.map((unit) => [unit.title, unit]))
function sentenceUnits(sentence) {
  return [...sentence.text].filter((char) => /[\u4e00-\u9fff]/.test(char)).map((char) => byTitle[char])
}
function eligibleSentences(progress) {
  return sentences.filter((sentence) => sentenceUnits(sentence).every((unit) => unit && progress.completedIds[unit.id]))
}

module.exports = { sentences, sentenceUnits, eligibleSentences }
