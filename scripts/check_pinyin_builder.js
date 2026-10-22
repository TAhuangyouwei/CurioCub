const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  initials,
  standardFinals,
  medials,
  wholeSyllables,
  composeThreeFinal,
  getAvailableFinals,
  getAvailableTones,
  getAvailableThreeEndings,
  getExample,
  formatPinyin
} = require('../data/pinyin-builder')
const { syllableExamples } = require('../data/pinyin-syllables')
const { getPinyinLocalAudio } = require('../data/pinyin-local-audio')
const { getPinyinBasicAudio } = require('../data/pinyin-basic-audio')

const root = path.join(__dirname, '..')
const good = getExample('h', 'ao', 3)
assert(good, 'h + ao + 三声应能拼出一个读音')
assert.strictEqual(good.character, '好', 'hǎo 应使用“好”作为代表字')
assert.strictEqual(formatPinyin(good.base, good.tone), 'hǎo', 'hǎo 声调显示不正确')

assert.strictEqual(initials.length, 23, '声母表应完整显示 23 个声母')
assert.strictEqual(standardFinals.length, 24, '韵母表应完整显示 24 个标准韵母')
assert.strictEqual(wholeSyllables.length, 16, '应完整显示 16 个整体认读音节')
assert.strictEqual(medials.length, 3, '三拼练习应提供 i、u、ü 三个介母')
assert.strictEqual(composeThreeFinal('u', 'a'), 'ua', '三拼组合 u + a 不正确')
assert(getExample('g', composeThreeFinal('u', 'a'), 1), 'g + u + a 应可拼出 guā')
assert(getAvailableThreeEndings('j', 'ü').some((item) => item.value === 'an' && item.available), 'j + ü + an 应可拼读')
assert(Object.keys(syllableExamples).length > 1000, '拼读表应覆盖完整的常见拼音和声调组合')

const packageSizes = {}
Object.keys(syllableExamples).forEach((key) => {
  const audio = getPinyinLocalAudio(key)
  assert(audio, `${key} 缺少离线音频分包映射`)
  const filePath = path.join(root, audio.filePath.slice(1))
  assert(fs.existsSync(filePath), `${key} 缺少离线拼读音频`)
  packageSizes[audio.packageName] = packageSizes[audio.packageName] || 0
  packageSizes[audio.packageName] += fs.statSync(filePath).size
})

initials.forEach((initial) => {
  const audio = getPinyinBasicAudio('initial', initial.value)
  assert(fs.existsSync(path.join(root, audio.filePath.slice(1))), `${initial.label} 缺少声母按键音频`)
  const usableFinals = getAvailableFinals(initial.value).filter((item) => item.available)
  assert(usableFinals.length > 0, `${initial.label} 至少应有一个可拼读韵母`)
  usableFinals.forEach((final) => {
    assert(getAvailableTones(initial.value, final.value).some((tone) => tone.available), `${initial.label} + ${final.label} 至少应有一个可用声调`)
  })
})

standardFinals.forEach((final) => {
  const audio = getPinyinBasicAudio('final', final.value)
  assert(fs.existsSync(path.join(root, audio.filePath.slice(1))), `${final.label} 缺少韵母按键音频`)
})

for (let tone = 1; tone <= 4; tone += 1) {
  const audio = getPinyinBasicAudio('final', 'ei', tone)
  assert(fs.existsSync(path.join(root, audio.filePath.slice(1))), `ei 缺少第 ${tone} 声按键音频`)
}

wholeSyllables.forEach((syllable) => {
  const audio = getPinyinLocalAudio(syllable.audioKey)
  assert(audio && fs.existsSync(path.join(root, audio.filePath.slice(1))), `${syllable.label} 缺少整体认读音频`)
})

Object.entries(packageSizes).forEach(([packageName, bytes]) => {
  assert(bytes < 2 * 1024 * 1024, `${packageName} 超过微信小程序单分包 2 MB 限制`)
})

const basicAudioFolder = path.join(root, 'assets', 'audio', 'pinyin-basic')
const basicBytes = fs.readdirSync(basicAudioFolder)
  .reduce((sum, filename) => sum + fs.statSync(path.join(basicAudioFolder, filename)).size, 0)
assert(basicBytes < 1024 * 1024, '声母韵母基础音频体积异常')

const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
appConfig.subpackages
  .filter((item) => /^packages\/pinyin-\d+$/.test(item.root))
  .forEach((item) => {
    assert(item.pages.includes('pages/builder/index'), `${item.name} 缺少拼读页面`)
    const files = []
    const visit = (folder) => fs.readdirSync(folder, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(fullPath)
      else files.push(fullPath)
    })
    visit(path.join(root, item.root))
    const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0)
    assert(bytes < 2 * 1024 * 1024, `${item.name} 超过微信小程序单分包 2 MB 限制`)
  })

const builderStyle = fs.readFileSync(path.join(root, 'pages', 'pinyin-builder', 'pinyin-builder.wxss'), 'utf8')
assert(builderStyle.includes('.option-grid { display: flex; flex-wrap: wrap;'), '声母韵母按键应使用兼容小程序的换行布局')
assert(builderStyle.includes('.tone-grid { display: flex;'), '五个声调应使用稳定的单行布局')
assert(builderStyle.includes('.mode-tabs { display: flex;'), '三个拼读模式应完整显示')

console.log('拼音学练机检查通过：23 个声母、24 个韵母、16 个整体认读、两拼、三拼及离线音频均正常。')
