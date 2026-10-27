const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getModule } = require('../data/learning')
const old = require('./hanzi-before-import-3.json')
const sources = require('./hanzi-reading-sources-3.json')
const added = require('./hanzi-reading-added-3.json')
const units = getModule('hanzi').items
assert.strictEqual(sources.length, 17)
const extracted = [...new Set(sources.map((row) => row.title + row.text).join('').match(/[\u4e00-\u9fff]/g))]
assert.strictEqual(extracted.length, 266)
assert.deepStrictEqual(extracted.filter((char) => !old.some((unit) => unit.title === char)), added)
assert.strictEqual(added.length, 156)
assert(units.length >= 458)
for (const [index, previous] of old.entries()) {
  for (const field of ['id', 'title', 'phrase', 'pinyin', 'icon', 'packageName', 'imageFile', 'characterAudioFile', 'phraseAudioFile']) {
    assert.strictEqual(units[index][field], previous[field], `旧字 ${previous.title} 的 ${field} 不能改变`)
  }
}
assert.strictEqual(new Set(units.map((unit) => unit.title)).size, units.length)
for (const char of extracted) assert(units.some((unit) => unit.title === char), `${char} 不能漏收`)
units.slice(302, 458).forEach((unit, index) => {
  assert.strictEqual(unit.title, added[index])
  assert.strictEqual(unit.id, `hanzi-${303 + index}`)
  assert(unit.phrase.includes(unit.title))
  assert(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/.test(unit.pinyin))
  for (const field of ['imageFile', 'characterAudioFile', 'phraseAudioFile']) {
    assert(unit[field].startsWith(`/packages/${unit.packageName}/`), '分包资源必须自包含')
    assert(fs.statSync(path.join(__dirname, '..', unit[field])).size > 0)
  }
})
for (const [char, pinyin] of Object.entries({ 漂: 'piào', 模: 'mú', 弹: 'tán', 觉: 'jiào', 处: 'chù', 还: 'hái', 脊: 'jǐ', 背: 'bèi', 跷: 'qiāo' })) {
  assert.strictEqual(units.find((unit) => unit.title === char).pinyin, pinyin)
}
for (const name of ['hanzi-reading-5', 'hanzi-reading-6', 'hanzi-reading-7']) {
  const entry = require('../app.json').subpackages.find((item) => item.name === name)
  assert(entry, `${name} 缺少注册`)
  entry.pages.forEach((page) => ['js','json','wxml','wxss'].forEach((ext) => assert(fs.existsSync(path.join(__dirname, '..', entry.root, `${page}.${ext}`)))))
}
console.log('第三批童谣检查通过：17 图、266 个来源字、156 个新增字、458 张完整字卡，旧记录兼容，多音字与分包资源均正确。')
