const assert = require('assert')
const store = new Map()
let nextTimer = 0
const timers = new Map()
global.setTimeout = (callback) => { timers.set(++nextTimer, callback); return nextTimer }
global.clearTimeout = id => timers.delete(id)
function flush() { const ready = [...timers.values()]; timers.clear(); ready.forEach(callback => callback()) }
const played = []
const requests = []
const toasts = []
const player = { stop() {}, play() { played.push(this.src) }, onError() {}, offError() {}, onCanplay() {}, offCanplay() {}, onEnded() {}, offEnded() {} }
global.getApp = () => ({ globalData: { audio: player } })
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, value),
  loadSubpackage: request => requests.push(request),
  showToast: toast => toasts.push(toast)
}
const { getModule } = require('../data/learning')
const { createHanziAudio } = require('../utils/hanzi-audio')
const { setAutoRead } = require('../utils/hanzi-settings')
const units = getModule('hanzi').items
const audio = createHanziAudio()
audio.schedule(units[0])
assert.strictEqual(played.length, 0, '首次进入应等卡片停稳再读')
flush()
assert.deepStrictEqual(played, ['/assets/audio/hanzi-01-character.mp3'])
audio.schedule(units[1])
audio.schedule(units[2])
audio.schedule(units[3])
flush()
assert.deepStrictEqual(played, ['/assets/audio/hanzi-01-character.mp3', '/assets/audio/hanzi-04-character.mp3'], '快速切换只读停留的字')
audio.schedule(units[40])
flush()
assert.strictEqual(requests.length, 1)
audio.schedule(units[0])
requests.shift().success()
assert.strictEqual(played.length, 2, '旧资源包迟到不能读错字')
flush()
assert.strictEqual(played.at(-1), '/assets/audio/hanzi-01-character.mp3')
audio.schedule(units[1])
audio.stop()
flush()
assert.strictEqual(played.length, 3, '退出/隐藏后不得继续朗读')
setAutoRead(false)
audio.schedule(units[2])
flush()
assert.strictEqual(played.length, 3)
audio.play(units[2])
assert.strictEqual(played.at(-1), '/assets/audio/hanzi-03-character.mp3', '关闭自动朗读仍可手动听')
setAutoRead(true)
const practice = createHanziAudio(true)
practice.schedule(units[457])
flush()
assert.strictEqual(requests[0].name, 'hanzi-practice')
requests.shift().success()
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-458.mp3')
practice.schedule(units[0])
flush()
practice.stop()
requests.shift().fail()
assert.strictEqual(toasts.length, 0, '过期的加载失败不得打扰当前页面')
console.log('自动朗读检查通过：首次进入、连续切换、跨包迟到、关闭/手动播放、临摹音频与离页取消。')
