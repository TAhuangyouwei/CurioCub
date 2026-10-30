const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { words } = require('../data/english-vocabulary')
const { topics, createRound, optionsFor } = require('../utils/english-listening')
const { readyAudio } = require('./lesson-test-fixture')
const store = new Map([['curiocub-progress-v1', { stars: 8, completedIds: { 'english-01': true } }]])
const originalProgress = JSON.stringify(store.get('curiocub-progress-v1'))
let definition
let stopCount = 0
const routes = []
const audio = readyAudio({ stop() { stopCount++ }, play() {}, onError() {}, offError() {}, onEnded() {}, offEnded() {} })
global.getApp = () => ({ globalData: { audio } })
global.Page = page => { definition = page }
global.wx = {
  getStorageSync: key => store.has(key) ? JSON.parse(JSON.stringify(store.get(key))) : null,
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  showToast() {}, navigateTo: options => routes.push(options.url), navigateBack: () => routes.push('back')
}
for (const topic of topics) {
  for (let repeat = 0; repeat < 20; repeat++) {
    const round = createRound(topic.id)
    assert.strictEqual(round.length, 5)
    assert.strictEqual(new Set(round.map(word => word.id)).size, round.length)
    for (const word of round) {
      const options = optionsFor(word)
      assert.strictEqual(options.length, 3)
      assert.strictEqual(new Set(options.map(option => option.id)).size, 3)
      assert.strictEqual(options.filter(option => option.id === word.id).length, 1)
      const category = word.topic
      for (const option of options) {
        assert.strictEqual(words.find(unit => unit.id === option.id).topic, category, '干扰项必须同类，不能靠物体/颜色类别猜答案')
        assert(!('title' in option) && !('phrase' in option), '作答前不应下发单词或中文提示')
        assert(option.image.endsWith(`/${words.find(unit => unit.id === option.id).word}.webp`), '每个选项必须使用对应单词的实际图片')
      }
      assert(fs.statSync(path.join(__dirname, '..', word.audioFile)).size > 0)
    }
  }
}
require('../packages/english-vocabulary/pages/listening/index')
function instance(topic) {
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
  page.onLoad({ topic })
  page.onShow()
  return page
}
const page = instance('animals')
const choose = id => page.choose({ currentTarget: { dataset: { id } } })
page.start()
page.next()
assert.strictEqual(page.data.position, 1, '不能跳过未答题目')
choose(page.currentWord.id)
assert(!page.data.answered && !store.has('curiocub-english-listening-v1'), '先听音才能作答')
assert.strictEqual(page.data.word, null)
const missed = page.currentWord.id
page.listen()
assert(audio.src.endsWith(page.currentWord.audioFile))
choose(page.data.options.find(option => option.id !== missed).id)
assert(!page.data.answered && page.data.word === null, '选错不能直接显示答案或结束题目')
choose(missed)
assert(page.data.answered && page.data.word.id === missed)
choose(missed)
assert.strictEqual(store.get('curiocub-english-listening-v1')[missed].rounds, 1, '重复点击不能重复记入')
for (let i = 1; i < page.data.total; i++) {
  page.next()
  assert(!page.data.heard && !page.data.answered && page.data.word === null, '下一题重置声音及答案')
  page.listen()
  choose(page.currentWord.id)
}
page.next()
assert(page.data.finished)
assert.strictEqual(page.data.firstCorrectCount, 4)
assert.deepStrictEqual(page.data.retryWords.map(word => word.id), [missed])
page.next()
page.retry()
page.retry()
assert.strictEqual(page.data.total, 1, '重练只练本轮选错过的词，并防止重复启动')
assert.strictEqual(page.currentWord.id, missed)
assert.strictEqual(page.data.options.length, 3, '即使重练一个词，也要保留同类干扰项')
page.listen()
choose(missed)
page.next()
const stats = store.get('curiocub-english-listening-v1')[missed]
assert.strictEqual(stats.rounds, 2)
assert.strictEqual(stats.firstCorrect, 1)
assert.strictEqual(stats.lastFirstCorrect, true)
assert(stats.lastPracticedAt > 0)
assert.strictEqual(JSON.stringify(store.get('curiocub-progress-v1')), originalProgress, '听力练习不能改变旧进度或发放重复奖励')
const beforeHide = stopCount
page.onHide()
assert(stopCount > beforeHide, '切后台必须停止播放')
page.chooseAgain()
assert(!page.data.started)
assert.strictEqual(page.data.reviewCount, 0)
page.startReview()
assert(!page.data.started, '没有待复习词时不能启动空题组')
const interrupted = instance('numbers')
interrupted.start()
interrupted.listen()
const forgotten = interrupted.currentWord.id
interrupted.choose({ currentTarget: { dataset: { id: interrupted.data.options.find(option => option.id !== forgotten).id } } })
interrupted.onHide()
const restored = instance('colors')
assert.strictEqual(restored.data.reviewCount, 1, '答错后立即退出，也要保留待复习词')
restored.startReview()
assert.strictEqual(restored.currentWord.id, forgotten, '全局复习入口应覆盖其他主题')
restored.listen()
restored.choose({ currentTarget: { dataset: { id: forgotten } } })
restored.next()
assert(restored.data.finished && restored.data.reviewCount === 0, '一遍选对后移出跨次复习列表')
assert.strictEqual(JSON.stringify(store.get('curiocub-progress-v1')), originalProgress)
page.goBack()
assert.strictEqual(routes.at(-1), 'back')
assert.strictEqual(instance('invalid').data.topic, 'all')
require('../pages/module/module')
definition.openEnglishListening({ currentTarget: { dataset: {} } })
assert.strictEqual(routes.at(-1), '/pages/english-listening/english-listening?topic=all')
assert(require('../app.json').pages.includes('pages/english-listening/english-listening'))
console.log('英语听图页面检查通过：150词、5题、先听后答、错误重试、跨次复习、空队列、离页停音及原进度保护。')
