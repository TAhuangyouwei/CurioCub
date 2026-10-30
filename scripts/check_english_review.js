const assert = require('assert')
const { words, groups } = require('../data/english-vocabulary')
const practice = require('../utils/english-listening')
const store = new Map()
const KEY = 'curiocub-english-listening-v1'
global.wx = {
  getStorageSync: key => store.has(key) ? JSON.parse(JSON.stringify(store.get(key))) : null,
  setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value)))
}
assert.strictEqual(practice.topics.length, 16, '全部词库的 15 个主题都要能练习')
assert.strictEqual(practice.createRound('all').length, 5, '每轮最多 5 题')
for (const group of groups) {
  for (const word of words.filter(word => word.topic === group.id)) {
    assert.strictEqual(practice.createRound(group.id, [word.id])[0].id, word.id, '主题内的每个词都应能进入练习')
  }
  for (let repeat = 0; repeat < 40; repeat++) {
    const round = practice.createRound(group.id)
    assert.strictEqual(round.length, 5)
    assert.strictEqual(new Set(round.map(word => word.id)).size, 5)
    for (const word of round) {
      assert.strictEqual(word.topic, group.id)
      const options = practice.optionsFor(word)
      assert.strictEqual(options.length, 3)
      assert.strictEqual(new Set(options.map(option => option.id)).size, 3)
      assert(options.some(option => option.id === word.id))
      for (const option of options) {
        assert.strictEqual(words.find(unit => unit.id === option.id).topic, group.id)
        assert(!('title' in option) && !('phrase' in option), '作答前不透露答案')
      }
    }
  }
}
const ambiguous = [
  ['head', 'eye'], ['face', 'mouth'], ['leg', 'foot'], ['house', 'door'],
  ['house', 'window'], ['book', 'desk'], ['book', 'teacher'], ['sit', 'read'],
  ['boy', 'brother'], ['girl', 'sister'], ['sister', 'friend']
]
for (const [a, b] of ambiguous) for (let repeat = 0; repeat < 40; repeat++) {
  for (const [target, excluded] of [[a, b], [b, a]]) {
    assert(!practice.optionsFor(practice.createRound('all', [target])[0]).some(option => option.id === excluded),
      `${target}/${excluded} 图像包含关系不应互相干扰`)
  }
}
assert.deepStrictEqual(practice.getReviewWords(), [])
practice.recordMiss('head')
assert.deepStrictEqual(practice.getReviewWords().map(word => word.id), ['head'], '选错即保存，不能等到本题答对')
const reloaded = require('../utils/english-listening')
assert.strictEqual(reloaded.getReviewWords()[0].id, 'head', '重新进入仍保留待复习词')
practice.recordAnswer('head', false)
assert.strictEqual(practice.getReviewWords()[0].id, 'head', '尝试后答对仍应复习')
practice.recordAnswer('head', true)
assert.strictEqual(practice.getReviewWords().length, 0, '之后一遍选对才移出待复习')
assert.strictEqual(store.get(KEY).head.rounds, 2)
assert.strictEqual(store.get(KEY).head.firstCorrect, 1)
store.set(KEY, {
  'english-01': { rounds: 4, firstCorrect: 2, lastFirstCorrect: false, lastPracticedAt: 1 },
  'english-02': { rounds: 2, firstCorrect: 2, lastFirstCorrect: true, lastPracticedAt: 2 }
})
assert.deepStrictEqual(practice.getReviewWords().map(word => word.id), ['dog'], '旧 12 词的错误记录应迁移')
practice.recordAnswer('dog', true)
assert.strictEqual(store.get(KEY).dog.rounds, 5)
assert.strictEqual(store.get(KEY).dog.firstCorrect, 3)
assert.strictEqual(store.get(KEY).cat.rounds, 2, '迁移时不能丢失其他旧记录')
assert(!store.get(KEY)['english-01'])
assert.strictEqual(practice.getReviewWords().length, 0)
for (const word of words.slice(0, 8)) practice.recordMiss(word.id)
const review = practice.getReviewWords()
const round = practice.createRound('all', review.slice(0, 5).map(word => word.id))
assert.strictEqual(round.length, 5)
assert(round.every(word => review.some(item => item.id === word.id)))
assert.strictEqual(practice.createRound('all', []).length, 0)
const before = JSON.stringify(store.get(KEY))
practice.recordMiss('unknown-word')
practice.recordAnswer('unknown-word', true)
assert.strictEqual(JSON.stringify(store.get(KEY)), before, '未知 ID 不能污染记录')
console.log('150 词练习与跨次复习检查通过：15 主题、5题、无歧义选项、退出保留、首答移除、旧记录迁移。')
