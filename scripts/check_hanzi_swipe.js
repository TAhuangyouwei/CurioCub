const assert = require('assert')
const { getModule } = require('../data/learning')
const { createLessonPage } = require('../pages/lesson/lesson-page')
const { getLearningPage } = require('../utils/learning-navigation')
const { orderedHanzi } = require('../utils/hanzi-settings')

const hanzi = { ...getModule('hanzi'), items: [] }
let saved = { completedIds: { 'hanzi-10': true }, stars: 1, stickerCount: 0, lastModuleId: 'hanzi' }
const app = { globalData: { audio: { stop() {} }, lessonRequest: null } }
let redirect = null
global.getApp = () => app
global.wx = {
  getStorageSync(key) { return key === 'curiocub-hanzi-settings-v1' ? { autoRead: false } : saved },
  setStorageSync(key, value) { saved = JSON.parse(JSON.stringify(value)) },
  redirectTo(options) { redirect = options.url }
}
hanzi.items = orderedHanzi()

function lessonAt(unitId, moduleId = 'hanzi') {
  const definition = createLessonPage()
  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes) { Object.assign(this.data, changes) }
  }
  page.onLoad({ moduleId, unitId })
  return page
}

const firstStationEnd = lessonAt('hanzi-10')
assert.strictEqual(firstStationEnd.lessonItems[10] && firstStationEnd.lessonItems[10].id, 'hanzi-11', '第一站末尾必须有可滑入的第二站首字')
firstStationEnd.showHint({ currentTarget: { dataset: { unitId: 'hanzi-10' } } })
const afterHint = JSON.stringify(saved)
firstStationEnd.onCardChange({ detail: { current: 10 } })
assert.strictEqual(firstStationEnd.data.unit.id, 'hanzi-11')
assert.strictEqual(firstStationEnd.data.currentNumber, 1)
assert.strictEqual(firstStationEnd.data.cardTotal, 10)
assert.strictEqual(firstStationEnd.data.hintVisible, false)
assert.strictEqual(firstStationEnd.data.completed, false)
firstStationEnd.onCardChange({ detail: { current: 9 } })
assert.strictEqual(firstStationEnd.data.unit.id, 'hanzi-10', '第二站首字应能反向滑回第一站末字')
assert.strictEqual(firstStationEnd.data.completed, true, '看提示和滑动后仍保留主动标记的已学会状态')
assert.strictEqual(firstStationEnd.data.unlearned, false)

for (let boundary = hanzi.groupSize; boundary < hanzi.items.length; boundary += hanzi.groupSize) {
  for (const [from, to] of [[boundary - 1, boundary], [boundary, boundary - 1]]) {
    const page = lessonAt(hanzi.items[from].id)
    redirect = null
    page.onCardChange({ detail: { current: to } })
    const target = hanzi.items[to]
    if (hanzi.items[from].packageName !== target.packageName) {
      assert.strictEqual(redirect, `${getLearningPage('lesson', target)}?moduleId=hanzi&unitId=${target.id}`, '跨资源包时应进入目标学习页以加载图片和音频')
    } else {
      assert.strictEqual(redirect, null, '同一资源包内应直接滑动')
      assert.strictEqual(page.data.unit.id, target.id)
    }
    const destination = redirect ? lessonAt(target.id) : page
    assert.strictEqual(destination.data.currentIndex, to)
    assert.strictEqual(destination.data.currentNumber, to % hanzi.groupSize + 1)
    assert.strictEqual(destination.data.cardTotal, Math.min(10, hanzi.items.length - Math.floor(to / 10) * 10))
  }
}

for (const index of [0, hanzi.items.length - 1]) {
  const page = lessonAt(hanzi.items[index].id)
  assert.strictEqual(page.data.unit.id, hanzi.items[index].id)
  assert.strictEqual(page.data.currentIndex, index)
  assert.strictEqual(page.lessonItems.length, hanzi.items.length, '仅在全部汉字的首尾停止滑动')
}

for (const moduleId of ['pinyin', 'math', 'english']) {
  const module = getModule(moduleId)
  const page = lessonAt(module.items[module.groupSize].id, moduleId)
  assert.strictEqual(page.lessonItems.length, module.groupSize, '其他模块仍按原有分站学习')
  assert.strictEqual(page.data.currentIndex, 0)
  assert.strictEqual(page.data.currentNumber, 1)
}
assert.strictEqual(JSON.stringify(saved), afterHint, '滑动不能改变提示后保存的学习记录和奖励')
console.log('识字滑动检查通过：各站双向连滑、分包切换、站内计数、提示与完成状态、首尾及其他模块均正常。')
