const assert = require('assert')
const { generateQuestions } = require('../packages/math-sticks/utils/arithmetic')

for (const operation of ['add', 'subtract']) {
  for (const limit of [1, 5, 10, 20, 100]) {
    for (let round = 0; round < 20; round++) {
      const questions = generateQuestions(operation, limit)
      assert.strictEqual(questions.length, 10)
      for (const q of questions) {
        assert(Number.isInteger(q.left) && Number.isInteger(q.right))
        assert(q.left >= 0 && q.left <= limit && q.right >= 0 && q.right <= limit)
        assert(q.answer >= 0 && q.answer <= limit)
        assert.strictEqual(q.answer, operation === 'add' ? q.left + q.right : q.left - q.right)
      }
      if (limit >= 3) assert.strictEqual(new Set(questions.map(q => `${q.left}:${q.right}`)).size, 10, '可用题目足够时本轮不能重复')
    }
  }
}
for (const limit of [0, -1, 1.5, 101, NaN]) assert.throws(() => generateQuestions('add', limit))
assert.throws(() => generateQuestions('multiply', 10))

let definition
let toast = ''
let navigation = ''
global.Page = page => { definition = page }
global.wx = {
  showToast: options => { toast = options.title },
  getStorageSync: () => null,
  setStorageSync() { throw new Error('随机练习不得覆盖学习记录与奖励') },
  navigateTo: options => { navigation = options.url },
  setNavigationBarTitle() {}
}
require('../packages/math-sticks/pages/practice/index')
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) {
  for (const [key, value] of Object.entries(changes)) {
    const nested = key.match(/^questions\[(\d+)\]\.response$/)
    if (nested) this.data.questions[Number(nested[1])].response = value
    else this.data[key] = value
  }
} }
page.generate()
assert.strictEqual(page.data.questions.length, 10)
page.checkAnswers()
assert(!page.data.checked && toast.includes('没填'))
page.data.questions.forEach((question, index) => {
  page.onAnswerInput({ currentTarget: { dataset: { index } }, detail: { value: String(question.answer + (index === 0 ? 1 : 0)) } })
})
assert(!page.data.checked, '填写时不能提前批改')
page.checkAnswers()
assert(page.data.checked)
assert.strictEqual(page.data.correctCount, 9)
assert.strictEqual(page.data.questions[0].correct, false)
page.onAnswerInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: String(page.data.questions[0].answer) } })
assert(!page.data.checked, '修改后应等待重新检查')
page.checkAnswers()
assert.strictEqual(page.data.correctCount, 10)
page.changeOperation({ currentTarget: { dataset: { operation: 'subtract' } } })
page.onLimitInput({ detail: { value: '5' } })
page.generate()
assert.strictEqual(page.data.roundOperation, 'subtract')
assert.strictEqual(page.data.roundLimit, 5)
assert(!page.data.checked)
assert(page.data.questions.every(q => q.response === '' && q.answer >= 0 && q.answer <= 5))
page.data.questions[0].answer = 0
page.data.questions.forEach(q => { q.response = String(q.answer) })
page.checkAnswers()
assert.strictEqual(page.data.correctCount, 10, '0 是有效答案')
const beforeInvalid = JSON.stringify(page.data.questions)
page.onLimitInput({ detail: { value: '0' } })
page.generate()
assert.strictEqual(JSON.stringify(page.data.questions), beforeInvalid)

require('../pages/module/module')
const map = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
map.onLoad({ moduleId: 'math' })
map.onShow()
assert.deepStrictEqual(map.data.groups.map(group => group.number), [1, 2], '数学旧三四站不再显示')
map.openMathPractice()
assert.strictEqual(navigation, '/packages/math-sticks/pages/practice/index')
assert(require('../app.json').subpackages.find(p => p.name === 'math-sticks').pages.includes('pages/practice/index'))
console.log('随机计算检查通过：加减法范围、每轮10题、整页填写/统一检查、订正/重生成、零答案、第三站入口与第四站隐藏。')
