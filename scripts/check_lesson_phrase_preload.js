require('./lesson-test-fixture')
const assert = require('assert')
const contexts = []
function context() {
  const audio = { src: '', plays: 0, stop() {}, destroy() { this.destroyed = true },
    play() { this.plays++ },
    onCanplay(fn) { this.ready = fn }, offCanplay() { this.ready = null },
    onError(fn) { this.error = fn }, offError() { this.error = null },
    onEnded(fn) { this.ended = fn }, offEnded() { this.ended = null } }
  contexts.push(audio)
  return audio
}
const app = { globalData: { audio: context() } }
global.getApp = () => app
global.wx = { createInnerAudioContext: context,
  getStorageSync: () => ({ autoRead: false }), setStorageSync() {}, showToast() {} }
const { createLessonPage } = require('../pages/lesson/lesson-page')
const page = createLessonPage()
page.setData = function (changes, callback) { Object.assign(this.data, changes); if (callback) callback() }
page.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-26' })
const first = contexts.at(-1)
assert.strictEqual(first.src, '/assets/audio/hanzi-26-phrase.mp3', '进字卡就准备词语，无需先点听词语')
assert.strictEqual(first.plays, 0)
first.ready()
page.playPhraseAudio()
assert.strictEqual(first.plays, 1)
page.setCurrentCard(page.lessonItems.findIndex(unit => unit.id === 'hanzi-44'))
const second = contexts.at(-1)
assert.strictEqual(second.src, '/packages/hanzi-extra/audio/hanzi-44-phrase.mp3', '跨包换字预备新词语')
assert(contexts[0].destroyed)
page.onHide()
assert(second.destroyed, '离页后销毁词语预加载实例')
console.log('词语预加载检查通过：进卡准备、静默预载、点击播放、跨包换字及离页释放。')
