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
require('./lesson-test-fixture').readyAudio(player)
global.wx = {
  getStorageSync: key => store.get(key),
  setStorageSync: (key, value) => store.set(key, value),
  loadSubpackage: request => requests.push(request),
  getFileSystemManager() { throw new Error('手机端不允许把代码包音频当作本地文件读取') },
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
assert.strictEqual(requests.length, 0, '学习页已在目标分包中，自动朗读不得重复加载')
assert.strictEqual(played.at(-1), units[40].characterAudioFile)
audio.schedule(units[0])
assert.strictEqual(played.length, 3, '换字后仍应等待卡片停稳')
flush()
assert.strictEqual(played.at(-1), '/assets/audio/hanzi-01-character.mp3')
audio.schedule(units[1])
audio.stop()
flush()
assert.strictEqual(played.length, 4, '退出/隐藏后不得继续朗读')
setAutoRead(false)
audio.schedule(units[2])
flush()
assert.strictEqual(played.length, 4)
audio.play(units[2])
assert.strictEqual(played.at(-1), '/assets/audio/hanzi-03-character.mp3', '关闭自动朗读仍可手动听')
setAutoRead(true)
const practice = createHanziAudio(true)
practice.schedule(units[457])
flush()
assert.strictEqual(requests.length, 0, '当前页面所在分包不需要重复加载')
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-458.mp3', '应直接播放页面所在分包的录音')
practice.play(units[61])
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-62.mp3', '电的听字应能直接启动')
const beforeStop = played.length
practice.schedule(units[0])
practice.stop()
flush()
assert.strictEqual(played.length, beforeStop, '离开页面后不得继续朗读')
setAutoRead(false)
practice.schedule(units[0])
flush()
assert.strictEqual(played.length, beforeStop)
practice.play(units[0])
assert.strictEqual(played.at(-1), '/packages/hanzi-practice/audio/hanzi-01.mp3', '关闭自动朗读仍能手动听字')
audio.play(units[40])
audio.stop()
assert.strictEqual(requests.length, 0, '手动听字也应直接播放已经加载的资源')
assert.strictEqual(toasts.length, 0, '正常播放不得误报声音加载失败')
console.log('自动朗读检查通过：首次进入、连续切换、分包直接播放、关闭/手动播放、临摹音频与离页取消。')
