const extraHanziSeed = require('./hanzi-extra')
const hanziPinyin = require('./hanzi-pinyin')

const hanziSeed = [
  ['土', '泥土', '🌱', 'hanzi-01-tu.png'], ['五', '五颗星', '⭐', 'hanzi-02-wu.png'], ['中', '中间', '🎯', 'hanzi-03-zhong.png'], ['上', '树上', '🌳', 'hanzi-04-shang.png'], ['天', '蓝天', '☁️', 'hanzi-05-tian.png'],
  ['禾', '禾苗', '🌾', 'hanzi-06-he.png'], ['人', '一个人', '👦', 'hanzi-07-ren.png'], ['尺', '尺子', '📏', 'hanzi-08-chi.png'], ['头', '头顶', '🙂', 'hanzi-09-tou.png'], ['下', '树下', '🌲', 'hanzi-10-xia.png'],
  ['虫', '小虫', '🐛', 'hanzi-11-chong.png'], ['把', '一把伞', '☂️', 'hanzi-12-ba.png'], ['口', '张开口', '👄', 'hanzi-13-kou.png'], ['子', '孩子', '👦', 'hanzi-14-zi.png'], ['水', '水滴', '💧', 'hanzi-15-shui.png'],
  ['你', '你和我', '🤝', 'hanzi-16-ni.png'], ['山', '大山', '⛰️', 'hanzi-17-shan.png'], ['牙', '牙齿', '😁', 'hanzi-18-ya.png'], ['长', '长长的', '🦒', 'hanzi-19-chang.png'], ['比', '比一比', '⚖️', 'hanzi-20-bi.png'],
  ['四', '四朵花', '🌷', 'hanzi-21-si.png'], ['西', '西瓜', '🍉', 'hanzi-22-xi.png'], ['小', '小小的', '🐞', 'hanzi-23-xiao.png'], ['了', '天黑了', '🌙', 'hanzi-24-le.png'], ['手', '小手', '🖐️', 'hanzi-25-shou.png'],
  ['我', '我自己', '🙋', 'hanzi-26-wo.png'], ['去', '去公园', '🌳', 'hanzi-27-qu.png'], ['东', '东边', '🌅', 'hanzi-28-dong.png'], ['心', '爱心', '❤️', 'hanzi-29-xin.png'], ['必', '必须洗手', '💧', 'hanzi-30-bi.png'],
  ['女', '女孩', '👧', 'hanzi-31-nv.png'], ['力', '力气', '💪', 'hanzi-32-li.png'], ['月', '月亮', '🌜', 'hanzi-33-yue.png'], ['儿', '花儿', '🌸', 'hanzi-34-er.png'], ['巴', '尾巴', '🐕', 'hanzi-35-ba.png'],
  ['几', '几只鸟', '🐦', 'hanzi-36-ji.png'], ['九', '九颗星', '✨', 'hanzi-37-jiu.png'], ['与', '你与我', '🤝', 'hanzi-38-yu.png'], ['马', '小马', '🐴', 'hanzi-39-ma.png'], ['鸟', '小鸟', '🐦', 'hanzi-40-niao.png']
]

const allHanziSeed = hanziSeed.concat(extraHanziSeed)

const pinyinSeed = [
  ['a', '张开嘴巴 a', '😮'], ['o', '圆圆嘴巴 o', '🟡'], ['e', '白鹅 e', '🐤'], ['i', '衣服 i', '👕'], ['u', '乌鸦 u', '🐦'], ['ü', '小鱼 ü', '🐟'],
  ['b', '广播 b', '📻'], ['p', '泼水 p', '💦'], ['m', '两个门洞 m', '🚪'], ['f', '一根拐杖 f', '🏒'], ['d', '小鼓 d', '🥁'], ['t', '小雨伞 t', '☂️']
]

const mathSeed = [
  ['1', '1 颗星星', '⭐'], ['2', '2 只小鸟', '🐦🐦'], ['3', '3 朵花', '🌷🌷🌷'], ['4', '4 条小鱼', '🐟🐟🐟🐟'], ['5', '5 个苹果', '🍎🍎🍎🍎🍎'],
  ['6', '6 片叶子', '🍃🍃🍃🍃🍃🍃'], ['7', '7 颗糖果', '🍬🍬🍬🍬🍬🍬🍬'], ['8', '8 个气球', '🎈🎈🎈🎈🎈🎈🎈🎈'], ['9', '9 颗星星', '✨✨✨✨✨✨✨✨✨'], ['10', '10 朵云', '☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️'],
  ['2', '1 + 1 = ?', '🐦 + 🐦'], ['3', '2 + 1 = ?', '🍎🍎 + 🍎'], ['4', '2 + 2 = ?', '🌷🌷 + 🌷🌷'], ['2', '3 - 1 = ?', '⭐⭐⭐ - ⭐'], ['3', '4 - 1 = ?', '🐟🐟🐟🐟 - 🐟'], ['3', '5 - 2 = ?', '🍎🍎🍎🍎🍎 - 🍎🍎']
]

const englishSeed = [
  ['dog', '小狗', '🐶'], ['cat', '小猫', '🐱'], ['bird', '小鸟', '🐦'], ['fish', '小鱼', '🐟'],
  ['red', '红色', '🔴'], ['blue', '蓝色', '🔵'], ['yellow', '黄色', '🟡'], ['green', '绿色', '🟢'],
  ['apple', '苹果', '🍎'], ['banana', '香蕉', '🍌'], ['orange', '橙子', '🍊'], ['grape', '葡萄', '🍇']
]

function choicesFor(answer, pool) {
  const index = pool.indexOf(answer)
  const candidates = [answer, pool[(index + 1) % pool.length], pool[(index + 2) % pool.length]]
  return candidates.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

function createItems(moduleId, seed, pool, questionPrefix) {
  return seed.map(([title, phrase, icon, imageFile], index) => {
    const number = String(index + 1).padStart(2, '0')
    const isHanzi = moduleId === 'hanzi'
    const isMath = moduleId === 'math'
    const packageName = isHanzi && index >= hanziSeed.length ? 'hanzi-extra' : ''
    const resourceRoot = packageName ? `/packages/${packageName}` : '/assets'

    return {
      id: `${moduleId}-${number}`,
      title,
      pinyin: isHanzi ? hanziPinyin[title] : '',
      phrase,
      icon,
      packageName,
      imageFile: imageFile ? `${resourceRoot}/images/hanzi/${imageFile}` : '',
      audioFile: isHanzi ? '' : `${moduleId}-${number}.mp3`,
      characterAudioFile: isHanzi ? `${packageName ? `${resourceRoot}/audio/` : ''}hanzi-${number}-character.mp3` : '',
      phraseAudioFile: isHanzi ? `${packageName ? `${resourceRoot}/audio/` : ''}hanzi-${number}-phrase.mp3` : '',
      question: isMath
        ? (index < 10 ? '数一数，选出正确数字' : '算一算，选出正确数字')
        : questionPrefix,
      options: choicesFor(title, pool),
      answer: title
    }
  })
}

const modules = [
  {
    id: 'hanzi', title: '识字星球', subtitle: '认识幼儿园汉字', icon: '📖', color: '#f4a85a', groupSize: 10,
    items: createItems('hanzi', allHanziSeed, allHanziSeed.map((item) => item[0]), '哪一个是')
  },
  {
    id: 'pinyin', title: '拼音花园', subtitle: '听声音找拼音', icon: '🔤', color: '#9a83d9', groupSize: 6,
    items: createItems('pinyin', pinyinSeed, pinyinSeed.map((item) => item[0]), '听一听，哪一个是')
  },
  {
    id: 'math', title: '数学乐园', subtitle: '数一数，算一算', icon: '🔢', color: '#4cab92', groupSize: 5,
    items: createItems('math', mathSeed, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], '数一数，选')
  },
  {
    id: 'english', title: '英语果园', subtitle: '听英文找图片', icon: '🍎', color: '#e77791', groupSize: 4,
    items: createItems('english', englishSeed, englishSeed.map((item) => item[0]), '听一听，选出正确英文单词')
  }
]

function getModule(moduleId) {
  return modules.find((item) => item.id === moduleId)
}

function getUnit(moduleId, unitId) {
  const module = getModule(moduleId)
  return module && module.items.find((item) => item.id === unitId)
}

module.exports = { modules, getModule, getUnit }
