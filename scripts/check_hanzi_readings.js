const assert = require('assert')
const fs = require('fs')
const path = require('path')
const lessons = require('./hanzi-reading-sources.json')
const lessons2 = require('./hanzi-reading-sources-2.json')
const vocabulary = require('./hanzi-reading-vocabulary.json').concat(require('./hanzi-reading-vocabulary-2.json'))
const { getModule } = require('../data/learning')
const { getLearningPage } = require('../utils/learning-navigation')

const hanzi = getModule('hanzi')
const sourceCharacters = [...new Set(lessons.flatMap(({ title, text }) => (title + text).match(/\p{Script=Han}/gu)))]
assert.strictEqual(sourceCharacters.length, 142)
assert.strictEqual(vocabulary.length, 224)
const sourceCharacters2 = [...new Set(lessons2.flatMap(({ title, text }) => (title + text).match(/\p{Script=Han}/gu)))]
assert.strictEqual(sourceCharacters2.length, 179)
new Set([...sourceCharacters, ...sourceCharacters2]).forEach((character) => {
  assert.strictEqual(hanzi.items.filter((unit) => unit.title === character).length, 1, `${character} 应收录且只出现一次`)
})
assert(hanzi.items.length >= 302, '此前两批的 302 个字不能减少')
vocabulary.forEach(([character, phrase, icon, image, pinyin], index) => {
  const unit = hanzi.items[index + 78]
  assert.strictEqual(unit.title, character, '新增字按照片首次出现顺序追加')
  assert.strictEqual(unit.id, `hanzi-${index + 79}`)
  assert.strictEqual(unit.pinyin, pinyin)
  assert.strictEqual(unit.phrase, phrase)
  assert.strictEqual(unit.icon, icon)
  assert.strictEqual(path.basename(unit.imageFile), `reading-${image.startsWith('@') ? `reuse-${image.slice(1)}` : image}.png`)
  assert(phrase.includes(character), `${character} 的配词应包含该字`)
  for (const field of ['imageFile', 'characterAudioFile', 'phraseAudioFile']) {
    assert(unit[field].startsWith(`/packages/${unit.packageName}/`), `${character} 资源应位于自己的分包`)
    assert(fs.statSync(path.join(__dirname, '..', unit[field])).size > 0, `${character} 缺少 ${field}`)
  }
  assert.strictEqual(getLearningPage('lesson', unit), '/pages/lesson/lesson')
})
assert.strictEqual(hanzi.items.find((unit) => unit.title === '斗').pinyin, 'dǒu')
assert.strictEqual(hanzi.items.find((unit) => unit.title === '得').pinyin, 'děi')
assert.strictEqual(hanzi.items.find((unit) => unit.title === '数').pinyin, 'shǔ')
assert.strictEqual(hanzi.items.find((unit) => unit.title === '扒').pinyin, 'bā')
assert.strictEqual(hanzi.items.find((unit) => unit.title === '谁').pinyin, 'shéi')
const app = require('../app.json')
for (const name of ['hanzi-extra', 'hanzi-reading-1', 'hanzi-reading-2', 'hanzi-reading-3', 'hanzi-reading-4']) {
  const entry = app.subpackages.find((item) => item.name === name)
  assert(entry, `${name} 应注册分包`)
  entry.pages.forEach((page) => {
    for (const suffix of ['js', 'json', 'wxml', 'wxss']) {
      assert(fs.existsSync(path.join(__dirname, '..', entry.root, `${page}.${suffix}`)))
    }
  })
  function bytes(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
      const file = path.join(directory, entry.name)
      return sum + (entry.isDirectory() ? bytes(file) : fs.statSync(file).size)
    }, 0)
  }
  assert(bytes(path.join(__dirname, '..', entry.root)) < 2 * 1024 * 1024, `${name} 资源应小于 2 MiB`)
}
console.log('童谣识字检查通过：两批 18 张图全部收录，224 个新增字的配词、拼音、图片、双音频与分包均完整。')
