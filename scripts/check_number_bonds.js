const assert = require('assert')
const fs = require('fs')
const { createQuestion } = require('../packages/math-sticks/utils/number-bonds')

for (const limit of [5, 10]) {
  for (const missing of ['left', 'right', 'whole']) {
    for (let round = 0; round < 100; round++) {
      const q = createQuestion(limit, missing)
      assert(q.whole >= 2 && q.whole <= limit)
      assert(q.left >= 1 && q.right >= 1)
      assert.strictEqual(q.left + q.right, q.whole)
      assert.strictEqual(q.missing, missing)
    }
  }
}

let definition
let navigation
global.Page = page => { definition = page }
global.wx = {
  setStorageSync() { throw new Error('分合练习不能改写学习记录') },
  navigateTo: options => { navigation = options.url }
}
require('../packages/math-sticks/pages/bonds/index')
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
const event = (key, value) => ({ currentTarget: { dataset: { [key]: value } } })
page.onLoad()
assert.strictEqual(page.data.stage, 'quantity')
assert.strictEqual(page.data.limit, 5)
assert(page.data.showDots)
assert.strictEqual(page.data.whole, 3)
page.changeLimit(event('limit', 10))
page.changeWhole(event('whole', 6))
assert.strictEqual(page.data.tenFrame.filter(cell => cell.filled).length, 6, '数字6对应6颗星星')
assert.strictEqual(page.data.tenFrame.slice(0, 5).filter(cell => cell.filled).length, 5)
assert.strictEqual(page.data.tenFrame.slice(5).filter(cell => cell.filled).length, 1, '6显示成5和1')
page.countStar(event('index', 5))
assert.strictEqual(page.data.counted, 0, '从第一颗开始逐一对应数数')
for (let index = 0; index < 6; index++) page.countStar(event('index', index))
assert.strictEqual(page.data.counted, 6)
assert(page.data.feedback.includes('一共有 6 颗'))
page.countStar(event('index', 6))
assert.strictEqual(page.data.counted, 6, '空格不能算成物品')
page.changeQuantity(event('delta', 1))
assert.strictEqual(page.data.whole, 7)
assert.strictEqual(page.data.counted, 0, '添一个以后，允许从1重新数')
for (let index = 0; index < 7; index++) page.countStar(event('index', index))
assert(page.data.feedback.includes('6 后面是 7'))
page.changeQuantity(event('delta', -1))
for (let index = 0; index < 6; index++) page.countStar(event('index', index))
assert(page.data.feedback.includes('7 颗拿走 1 颗，现在有 6 颗'))
page.changeWhole(event('whole', 1))
page.countStar(event('index', 0))
page.changeQuantity(event('delta', -1))
assert.strictEqual(page.data.whole, 1, '认数量先从1开始，不出现负数量')
for (let whole = 1; whole <= 10; whole++) {
  page.changeWhole(event('whole', whole))
  assert.strictEqual(page.data.tenFrame.filter(cell => cell.filled).length, whole)
  for (let index = 0; index < whole; index++) page.countStar(event('index', index))
  assert.strictEqual(page.data.counted, whole)
}
page.changeStage(event('stage', 'learn'))

for (const limit of [5, 10]) {
  page.changeLimit(event('limit', limit))
  for (let whole = 2; whole <= limit; whole++) {
    page.changeWhole(event('whole', whole))
    for (let i = 0; i < whole + 1; i++) page.moveStar(event('part', 'right'))
    assert.strictEqual(page.data.left, whole)
    assert.strictEqual(page.data.right, 0)
    for (let i = 0; i < whole + 1; i++) {
      page.moveStar(event('part', 'left'))
      assert.strictEqual(page.data.left + page.data.right, whole, '移动星星时总数守恒')
      assert.strictEqual(page.data.leftDots.length, page.data.left)
      assert.strictEqual(page.data.rightDots.length, page.data.right)
      assert.strictEqual(page.data.tenFrame.filter(cell => cell.filled).length, whole)
    }
    assert.strictEqual(page.data.left, 0)
    assert.strictEqual(page.data.right, whole)
    assert(page.data.reading.includes(String(whole)))
  }
}

page.changeStage(event('stage', 'practice'))
assert(!page.data.showDots)
for (let round = 0; round < 6; round++) {
  const missing = ['left', 'right', 'whole'][round % 3]
  assert.strictEqual(page.data.missing, missing, '轮流练两部分和总数')
  assert.strictEqual(page.data.response, '')
  assert.strictEqual(page.data.reading, '', '未答对前不展示完整口诀与答案')
  page.checkAnswer()
  assert(!page.data.correct)
  assert.strictEqual(page.data.reading, '', '答错时不直接显示完整分合答案')
  const solution = page.data[missing]
  page.chooseNumber(event('number', (solution + 1) % (page.data.limit + 1)))
  page.checkAnswer()
  assert(!page.data.correct)
  page.toggleHint()
  assert(page.data.showDots)
  page.chooseNumber(event('number', solution))
  assert(!page.data.correct, '选择后等待主动检查')
  page.checkAnswer()
  assert(page.data.correct)
  assert(page.data.reading.includes(String(solution)))
  page.nextQuestion()
  assert(!page.data.correct && !page.data.showDots, '换题应清除答案和提示')
}
page.changeLimit(event('limit', 5))
assert.strictEqual(page.data.questionNumber, 1)
assert(page.data.whole <= 5)
assert.deepStrictEqual(page.data.numberChoices, [0, 1, 2, 3, 4, 5])
page.chooseNumber(event('number', 0))
assert.strictEqual(page.data.response, '0', '0 应能作为答案输入')
const before = JSON.stringify(page.data)
page.chooseNumber(event('number', 99))
page.changeWhole(event('whole', 99))
page.changeLimit(event('limit', 99))
assert.strictEqual(JSON.stringify(page.data), before)
page.changeStage(event('stage', 'learn'))
assert(page.data.showDots && page.data.reading)

const root = '../packages/math-sticks/pages/bonds/'
const markup = fs.readFileSync(require.resolve(root + 'index.wxml'), 'utf8')
assert(!/<input\b/.test(markup), '练习使用页面数字按钮，避开 iPad 系统键盘')
assert(markup.includes('一共') && markup.includes('部分'), '分合图应明确整体与部分')
assert.strictEqual(require(root + 'index.json').navigationBarTitleText, '数的分解和组合')
const mapMarkup = fs.readFileSync(require.resolve('../pages/module/module.wxml'), 'utf8')
assert(mapMarkup.includes('第 4 站 · 数的分解和组合'))
require('../pages/module/module')
definition.openNumberBonds()
assert.strictEqual(navigation, '/packages/math-sticks/pages/bonds/index')
console.log('数的分合检查通过：1～10数量对应/逐颗点数、添1/少1、全部分法与总数守恒、三个空位轮换、提示/纠错/换题和页面数字输入。')
