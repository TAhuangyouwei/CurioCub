// October weeks 3–4: left to right, top to bottom on the school sheet.
const characters = '竹叶草分气豆勺刀面半点大高方圆亭花石林森去来弯多入少出开外关里坐飞看走吃立吐喝问笑哭直财砖领站门力田包又欠跑男欢'

// Append new identities; display order is separate from resource/progress IDs.
const added = [
  ['分', '分开', '🍎', 'school-fen.png', 'fēn'],
  ['气', '气球', '🎈', 'school-qi.png', 'qì'],
  ['勺', '勺子', '🥄', 'school-shao.png', 'sháo'],
  ['方', '方块', '🟦', 'school-fang.png', 'fāng'],
  ['亭', '凉亭', '🏡', 'school-ting.png', 'tíng'],
  ['林', '树林', '🌳', 'school-lin.png', 'lín'],
  ['森', '森林', '🌳', 'school-sen.png', 'sēn'],
  ['外', '外面', '🏡', 'school-wai.png', 'wài'],
  ['立', '立正', '👦', 'school-li.png', 'lì'],
  ['吐', '吐泡泡', '🐟', 'school-tu.png', 'tǔ'],
  ['喝', '喝水', '💧', 'school-he.png', 'hē'],
  ['哭', '哭了', '💧', 'school-ku.png', 'kū'],
  ['直', '直线', '📏', 'school-zhi.png', 'zhí'],
  ['财', '财宝', '💎', 'school-cai.png', 'cái'],
  ['欠', '打哈欠', '😴', 'school-qian.png', 'qiàn'],
  ['男', '男孩', '👦', 'school-nan.png', 'nán'],
  ['欢', '欢乐', '🎉', 'school-huan.png', 'huān']
]

function defaultOrder(units) {
  const first = units.slice(0, 78)
  const seen = new Set(first.map(unit => unit.id))
  const school = [...characters].map(char => units.find(unit => unit.title === char)).filter(unit => unit && !seen.has(unit.id))
  school.forEach(unit => seen.add(unit.id))
  return first.concat(school, units.filter(unit => !seen.has(unit.id)))
}

module.exports = { characters, added, defaultOrder }
