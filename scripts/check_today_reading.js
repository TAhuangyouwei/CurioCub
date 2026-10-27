const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { getModule } = require('../data/learning')
const { sentences, eligibleSentences } = require('../packages/hanzi-practice/data/reading')
const { getToday, finishCard, finishReading, selectReading, todayKey } = require('../packages/hanzi-practice/utils/session')
const units = getModule('hanzi').items
const byTitle = Object.fromEntries(units.map((unit) => [unit.title, unit]))
let state
global.wx = { getStorageSync: () => state ? JSON.parse(JSON.stringify(state)) : null,
  setStorageSync: (key, value) => { state = JSON.parse(JSON.stringify(value)) } }
const progress = { completedIds: {}, unlearnedIds: {} }
const day = '2026-10-26'
assert.strictEqual(todayKey(new Date(2026, 9, 26, 23, 59)), day, '日期应使用本地日历')
assert.strictEqual(eligibleSentences(progress).length, 0, '不能给零基础儿童推荐含生字的句子')
let session = getToday(progress, day)
assert(session.cards.length <= 5 && session.cards.filter((card) => !card.review).length <= 3)
assert.deepStrictEqual(getToday(progress, day).cards, session.cards, '当天中断重进不能换任务')
for (const card of session.cards) {
  progress.completedIds[card.id] = true
  session = finishCard(session, card.id)
}
assert(session.cards.every((card) => card.done))
const recommendation = selectReading(progress, day)
assert(recommendation, '首轮学字后应有可读短句')
for (const char of recommendation.text.replace(/[^\u4e00-\u9fff]/g, '')) assert(progress.completedIds[byTitle[char].id])
finishReading(recommendation.id, day)
assert.strictEqual(selectReading(progress, day).id, recommendation.id, '一天只能推荐一个新句子，重进应保留同一句')
assert.strictEqual(getToday(progress, day).readingDone, true)
const blocked = { ...progress, completedIds: { ...progress.completedIds } }
delete blocked.completedIds[byTitle['山'].id]
assert.strictEqual(selectReading(blocked, day), null, '已推荐句子后来包含未学会的字，应暂时隐藏，不能偷偷换成另一句新句子')
assert(getToday(progress, '2026-10-27').cards.some((card) => card.review), '次日应提供已学字复习')
for (const sentence of sentences) {
  const chars = sentence.text.replace(/[^\u4e00-\u9fff]/g, '')
  assert(chars.length >= 3 && chars.length <= 10)
  assert.strictEqual(sentence.pinyin.length, chars.length, `${sentence.text} 拼音应逐字对应`)
  for (const char of chars) assert(byTitle[char], `${sentence.text} 含字库以外的字`)
  assert(fs.statSync(path.join(__dirname, '..', sentence.audio)).size > 0, `${sentence.text} 缺少整句录音`)
}
assert.strictEqual(new Set(sentences.map((sentence) => sentence.id)).size, sentences.length)
for (const unit of units) assert(fs.statSync(path.join(__dirname, '..', 'packages/hanzi-practice/audio', `${unit.id}.mp3`)).size > 0)
assert.strictEqual(eligibleSentences({ completedIds: Object.fromEntries(units.map((unit) => [unit.id, true])) }).length, sentences.length)
const entry = require('../app.json').subpackages.find((item) => item.name === 'hanzi-practice')
assert(entry, '今日学习、阅读和临摹应注册在自己的离线资源包')
for (const page of entry.pages) for (const extension of ['js', 'json', 'wxml', 'wxss']) {
  assert(fs.existsSync(path.join(__dirname, '..', entry.root, `${page}.${extension}`)))
}
function bytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, item) => {
    const file = path.join(directory, item.name)
    return total + (item.isDirectory() ? bytes(file) : fs.statSync(file).size)
  }, 0)
}
assert(bytes(path.join(__dirname, '..', entry.root)) < 2 * 1024 * 1024, '离线资源包不能超出 2 MiB')
console.log('今日学习与短句检查通过：固定每日任务、恢复进度、数量限制、已学字门槛、每日一句、次日复习与离线录音。')
