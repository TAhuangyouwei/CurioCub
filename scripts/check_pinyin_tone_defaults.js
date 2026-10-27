const assert = require('assert')
const { createPinyinBuilderPage } = require('../pages/pinyin-builder/pinyin-builder')
const player = { src: '', play() {}, stop() {}, onError() {}, offError() {}, onCanplay() {}, offCanplay() {}, onEnded() {}, offEnded() {} }
let toast = ''
global.getApp = () => ({ globalData: { audio: player } })
global.wx = { showToast: options => { toast = options.title }, redirectTo() {} }
function page(options = {}) {
  const definition = createPinyinBuilderPage()
  const instance = { ...definition, route: 'packages/pinyin-04/pages/builder/index', data: JSON.parse(JSON.stringify(definition.data)),
    setData(changes, callback) { Object.assign(this.data, changes); if (callback) callback() } }
  instance.onLoad(options)
  return instance
}
const select = value => ({ currentTarget: { dataset: { value, available: true } } })
let builder = page()
assert.strictEqual(builder.data.selectedTone, 0, '未操作时不能偷偷选三声')
assert(builder.data.hasCombination, '没选声调不等于组合不能拼读')
assert.strictEqual(builder.data.pinyin, 'hao')
assert.strictEqual(builder.data.example, null, '未选声调不展示带调例字')
builder.readAloud()
assert(toast.includes('声调'))
builder.selectFinal(select('a'))
assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-a.mp3', '点韵母先读一声基础音')
assert.strictEqual(builder.data.selectedTone, 0)
builder = page({ tone: '3' })
assert.strictEqual(builder.data.pinyin, 'hǎo')
builder.selectFinal(select('a'))
assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-a.mp3', '即使之前选过声调，单独认读韵母也固定一声')
builder = page({ mode: 'three', tone: '4' })
builder.selectEnding(select('a'))
assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-a.mp3')
builder = page({ initial: 'f', final: 'o' })
assert.strictEqual(builder.data.selectedTone, 0, '不能自动选其他可用声调')
assert(builder.data.hasCombination)
builder = page({ initial: 'r', final: 'i', tone: '1' })
assert.strictEqual(builder.data.selectedTone, 0, '所选声调不可用时清除选择，不能偷偷改四声')
builder = page()
builder.selectTone(select(2))
assert.strictEqual(builder.data.selectedTone, 2)
assert.strictEqual(player.src, '/packages/pinyin-04/audio/hao2.mp3', '点声调只读对应完整音节')
builder.selectInitial(select('d'))
assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-d.mp3', '声母不跟随音节声调改变')
console.log('拼音声调检查通过：无默认选调、基础韵母固定一声、声母独立、选择后读整音节和不可用声调不自动跳换。')
