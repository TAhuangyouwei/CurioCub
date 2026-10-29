const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { getModule } = require('../data/learning')
const { getLearningPage } = require('../utils/learning-navigation')
const { createReviewPage } = require('../pages/review/review-page')

const root = path.resolve(__dirname, '..')
const timers = new Map()
let timerId = 0
global.setTimeout = callback => { timers.set(++timerId, callback); return timerId }
global.clearTimeout = id => timers.delete(id)
const flush = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()) }
const played = []
const player = { stop() {}, play() {
  assert(this.src.startsWith('/packages/hanzi-practice/audio/'), '临摹与配对不能播放其他分包资源')
  assert(fs.existsSync(path.join(root, this.src)))
  played.push(this.src)
}, onError() {}, offError() {}, onCanplay() {}, offCanplay() {}, onEnded() {}, offEnded() {} }
global.getApp = () => ({ globalData: { audio: player } })
require('./lesson-test-fixture').readyAudio(player)
const context = Object.fromEntries(['setTransform', 'clearRect', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'stroke', 'quadraticCurveTo', 'bezierCurveTo', 'closePath'].map(name => [name, () => {}]))
const canvas = { getContext: () => context }
let current, navigation
global.wx = {
  getStorageSync() {}, setStorageSync() {}, showToast() {}, setNavigationBarTitle() {},
  getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, screenHeight: 667, pixelRatio: 3, safeArea: { bottom: 633 } }),
  redirectTo: options => { navigation = options.url },
  getFileSystemManager() { throw new Error('代码包文件不能通过文件系统读取') },
  loadSubpackage() { throw new Error('不应重复加载当前音频分包') },
  createSelectorQuery() {
    return { in() { return this }, select() { return this }, fields() { return this },
      exec(callback) { callback([{ node: canvas, width: current.data.boardSize, height: current.data.boardSize }]) } }
  }
}
const entry = path.join(root, 'packages/hanzi-practice/pages/trace/index.js')
const requests = []
let definition
vm.runInNewContext(fs.readFileSync(entry, 'utf8'), {
  Page: value => { definition = value },
  require(id, success, fail) {
    const file = path.resolve(path.dirname(entry), id)
    if (!success) return require(file)
    assert.strictEqual(file, path.join(root, 'packages/hanzi-writing/utils/stroke-guide.js'))
    requests.push({ success, fail })
  }
}, { filename: entry })
function instance() {
  current = { ...definition, data: JSON.parse(JSON.stringify(definition.data)),
    setData(value, callback) { Object.assign(this.data, value); if (callback) callback() } }
  return current
}
const page = instance()
page.onLoad({ unitId: 'hanzi-62' })
page.onReady()
page.onShow()
assert.strictEqual(page.data.unit, null, '笔顺加载前不能初始化画板或播放错误的字')
const strokes = require('../packages/hanzi-writing/utils/stroke-guide')
requests.shift().success(strokes)
assert.strictEqual(page.data.unit.title, '电')
assert(page.context, '异步笔顺到达后应正确初始化已就绪的画板')
flush()
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-62.mp3')
page.playCharacter()
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-62.mp3')
page.nextCharacter()
flush()
assert.strictEqual(played.at(-1), `/packages/hanzi-practice/audio/${page.data.unit.id}.mp3`)
page.onUnload()
const beforeLateLoad = played.length
const leaving = instance()
leaving.onLoad({ unitId: 'hanzi-01' })
leaving.onReady()
leaving.onUnload()
requests.shift().success(strokes)
flush()
assert.strictEqual(leaving.data.unit, null)
assert.strictEqual(played.length, beforeLateLoad, '退出后的异步笔顺回调不能重新开声')
const hidden = instance()
hidden.onLoad({ unitId: 'hanzi-01' })
hidden.onReady()
hidden.onHide()
requests.shift().success(strokes)
flush()
assert.strictEqual(played.length, beforeLateLoad, '后台完成加载时不得自动朗读')
hidden.onShow()
flush()
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-01.mp3')
hidden.onUnload()
const failed = instance()
failed.onLoad({ unitId: 'hanzi-01' })
const loadError = new Error('mock subpackage failure')
const originalError = console.error
const errors = []
console.error = (...args) => errors.push(args)
try { requests.shift().fail(loadError) } finally { console.error = originalError }
assert(failed.data.strokeLoadFailed, '笔顺加载失败时应显示明确状态')
assert.strictEqual(errors[0][1], loadError)
failed.onUnload()
for (const unit of getModule('hanzi').items) {
  assert.strictEqual(getLearningPage('review', unit), '/packages/hanzi-practice/pages/review/index')
  assert(fs.statSync(path.join(root, `packages/hanzi-practice/audio/${unit.id}.mp3`)).size > 0)
}
const review = { ...createReviewPage(), route: 'pages/review/review' }
review.onLoad({ moduleId: 'hanzi', groupIndex: 7 })
assert.strictEqual(navigation, '/packages/hanzi-practice/pages/review/index?moduleId=hanzi&groupIndex=7', '旧识字配对链接也应进入音频所在分包')
const registration = require('../app.json').subpackages.find(item => item.name === 'hanzi-practice')
assert(registration.pages.includes('pages/trace/index') && registration.pages.includes('pages/review/index'))
console.log('真机音频分包检查通过：禁用文件读取、同包播放、异步笔顺/后台/退出、475 段录音及旧配对链接。')
