const assert = require('assert')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getModule } = require('../data/learning')
const manifest = require('./audio-sources/manifest.json')
const root = path.resolve(__dirname, '..')
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
const units = getModule('hanzi').items
assert.strictEqual(new Set(manifest.map(row => row.id)).size, manifest.length)
for (const row of manifest) {
  const unit = units.find(unit => unit.id === row.id)
  assert(unit)
  assert.strictEqual(row.pinyin, unit.pinyin)
  assert.strictEqual(hash(row.source), row.sourceSha256)
  row.files.forEach(file => assert.strictEqual(hash(file.path), file.sha256))
}
const chang = manifest.find(row => row.title === '长')
assert.strictEqual(chang.voice, 'zh-CN-XiaoxiaoNeural')
assert.strictEqual(chang.text, '常', '长 cháng 用晓晓直接读同音单字，不混入讲解')
assert.strictEqual(chang.rate, '+0%')
assert.strictEqual(chang.contextExtracted, false)
assert.strictEqual(chang.postProcessing, false)
const le = manifest.find(row => row.title === '了')
assert.strictEqual(le.voice, 'zh-CN-XiaoxiaoNeural')
assert.strictEqual(le.spokenPinyin, 'lē', '了的单字示范按用户指定读 le 一声')
assert.strictEqual(le.syllable, 'le1')
assert.strictEqual(le.text, 'lē')
assert.strictEqual(le.rate, '+0%')
assert.strictEqual(le.contextExtracted, false)
assert.strictEqual(le.postProcessing, false)
const dong = manifest.find(row => row.title === '东')
assert.strictEqual(dong.voice, 'zh-CN-XiaoxiaoNeural')
assert.strictEqual(dong.text, 'dōng', '东使用用户确认后鼻音正确的晓晓直读版本')
assert.strictEqual(dong.listeningReview, 'approved')
const played = []
const audio = { stop() {}, play() { played.push(this.src) }, onError() {}, offError() {} }
global.getApp = () => ({ globalData: { audio } })
global.wx = { getStorageSync() {}, showToast() {} }
global.setTimeout = callback => { callback(); return 1 }
global.clearTimeout = () => {}
const { createHanziAudio } = require('../utils/hanzi-audio')
const lesson = createHanziAudio()
const practice = createHanziAudio(true)
for (const unit of units) {
  lesson.schedule(unit)
  const expected = unit.characterAudioFile.startsWith('/') ? unit.characterAudioFile : '/assets/audio/' + unit.characterAudioFile
  assert.strictEqual(played.at(-1), expected, `${unit.title} 自动朗读只能调用单字录音`)
  const phrase = unit.phraseAudioFile.startsWith('/') ? unit.phraseAudioFile : '/assets/audio/' + unit.phraseAudioFile
  assert.notStrictEqual(hash(expected), hash(phrase), `${unit.title} 单字文件不能与词语录音相同`)
  practice.schedule(unit)
  assert.strictEqual(played.at(-1), `/packages/hanzi-practice/audio/${unit.id}.mp3`)
}
console.log('单字音频检查通过：长/了使用晓晓直读，了按用户要求为 lē；修复来源可追溯，475 字自动朗读路径正确。此检查不证明全部字的听感已通过。')
