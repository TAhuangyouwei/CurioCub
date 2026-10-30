const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getModule } = require('../data/learning')
const { defaultOrder } = require('../data/hanzi-school')
const { sentences, sentenceUnits } = require('../packages/hanzi-practice/data/reading')
const { readingTests } = require('../packages/hanzi-practice/utils/reading-tests')
const store = new Map()
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
global.wx = { getStorageSync: key => clone(store.get(key)), setStorageSync: (key, value) => store.set(key, clone(value)), showToast() {} }
const units = defaultOrder(getModule('hanzi').items)
const progressAt = count => ({ completedIds: Object.fromEntries(units.slice(0, count).map(unit => [unit.id, true])), unlearnedIds: {} })
const first = readingTests(progressAt(49))
assert(first.every(test => !test.unlocked), '第一组必须前 5 站全部学会才解锁')
const all = readingTests(progressAt(units.length))
assert.strictEqual(all.length, 10)
assert.strictEqual(all.at(-1).endStation, 48, '最后不足 5 站也有测试')
assert.strictEqual(sentences.length, 130)
assert.strictEqual(new Set(sentences.map(sentence => sentence.text)).size, 130, '句库不应重复句子凑数')
const seen = new Set()
for (const [index, test] of all.entries()) {
  assert(test.ready && test.unlocked && test.sentences.length === 10)
  const known = new Set(units.slice(0, test.endStation * 10).map(unit => unit.id))
  const recent = new Set(units.slice((test.firstStation - 1) * 10, test.endStation * 10).map(unit => unit.id))
  for (const sentence of test.sentences) {
    assert(!seen.has(sentence.id), '默认顺序各组应给出不重复的 10 句')
    seen.add(sentence.id)
    assert(sentenceUnits(sentence).every(unit => unit && known.has(unit.id)), `${test.title} 的 ${sentence.text} 不能混入后续站点字`)
    assert(sentenceUnits(sentence).some(unit => recent.has(unit.id)), '应重点使用最近五站的字')
    assert(fs.statSync(path.join(__dirname, '..', sentence.audio)).size > 100)
  }
  const boundary = Math.min(test.endStation * 10, units.length)
  const atBoundary = readingTests(progressAt(boundary))
  assert(atBoundary[index].unlocked)
  assert(readingTests(progressAt(boundary - 1)).slice(index).every(stage => !stage.unlocked), '缺一个字也不能提前解锁')
  assert.deepStrictEqual(atBoundary[index].sentences, test.sentences, '后续进度变化不能改变已解锁试题')
}

// A later block completed out of order must not unlock tests containing earlier unknown words.
const skipped = { completedIds: Object.fromEntries(units.slice(50, 100).map(unit => [unit.id, true])) }
assert(readingTests(skipped).every(test => !test.unlocked))
// Family-defined orders may not provide 10 grammatical sentences; never pad with unknown words.
store.set('curiocub-hanzi-settings-v1', { orderIds: units.map(unit => unit.id).reverse() })
const reversed = units.slice().reverse()
const customProgress = { completedIds: Object.fromEntries(reversed.slice(0, 50).map(unit => [unit.id, true])) }
const custom = readingTests(customProgress)
assert(custom[0].unlocked)
assert.notStrictEqual(custom[0].id, all[0].id)
assert(custom[0].sentences.every(sentence => sentenceUnits(sentence).every(unit => customProgress.completedIds[unit.id])))
assert(!custom[0].ready || custom[0].sentences.length === 10)
store.clear()

let definition
global.Page = page => { definition = page }
const audio = { stop() {}, play() {}, onError() {}, offError() {}, onEnded() {}, offEnded() {}, onCanplay() {}, offCanplay() {} }
global.getApp = () => ({ globalData: { audio } })
require('../packages/hanzi-practice/pages/reading/index')
function page() {
  const result = { ...definition, data: clone(definition.data), setData(value) { Object.assign(this.data, value) } }
  result.onLoad({})
  result.onShow()
  return result
}
store.set('curiocub-progress-v1', { ...progressAt(50), rewardedIds: {}, stars: 50, stickerCount: 12, lastModuleId: 'hanzi' })
const before = clone(store.get('curiocub-progress-v1'))
const reader = page()
assert(reader.data.testMode && reader.data.sentence && reader.data.total === 10)
assert.strictEqual(reader.data.showPinyin, false)
reader.finishWithHelp()
assert.strictEqual(reader.data.helped, 1)
for (let index = 0; index < 9; index++) reader.finish()
assert.strictEqual(reader.data.answered, 10)
assert.strictEqual(reader.data.independent, 9)
const resumed = page()
assert.strictEqual(resumed.data.answered, 10, '重进应保留测试结果')
assert.strictEqual(resumed.data.helped, 1)
assert.deepStrictEqual(store.get('curiocub-progress-v1'), before, '测试不能改动掌握情况或发识字奖励')
reader.showFreeReading()
assert(!reader.data.testMode && reader.data.sentence)
reader.showTests()
assert(reader.data.testMode && reader.data.answered === 10)
store.set('curiocub-progress-v1', { ...before, completedIds: progressAt(49).completedIds })
reader.onShow()
assert.strictEqual(reader.data.sentence, null, '后来标为未学会时不能继续显示锁定阶段')
console.log('阶段阅读检查通过：10 组×10 句、累计用字、近期覆盖、逐字门槛、末尾阶段、调序、帮助记录、恢复与奖励隔离。')
