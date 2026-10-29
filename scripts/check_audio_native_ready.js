const assert = require('assert')
const contexts = []
function context() {
  const audio = { _src: '', assignments: 0, plays: 0, stop() {}, destroy() { this.destroyed = true }, play() { this.plays++ },
    get src() { return this._src }, set src(value) { this._src = value; this.assignments++ },
    onCanplay(fn) { this.ready = fn }, offCanplay() { this.ready = null },
    onError(fn) { this.error = fn }, offError() { this.error = null },
    onEnded(fn) { this.ended = fn }, offEnded() { this.ended = null } }
  contexts.push(audio)
  return audio
}
const app = { globalData: { audio: context() } }
global.getApp = () => app
global.wx = { createInnerAudioContext: context, showToast() { throw new Error('可恢复的实例错误不应弹播放失败') } }
const { playAudioPath, stopAudio, preloadAudioPath, clearPreloadedAudio } = require('../utils/audio')
const file = '/packages/hanzi-reading-5/audio/hanzi-373-character.mp3'
playAudioPath(file)
assert.strictEqual(app.globalData.audio.plays, 0, '真机尚未就绪时不能立即调用 play')
app.globalData.audio.ready()
assert.strictEqual(app.globalData.audio.plays, 1)
const original = app.globalData.audio
original.error({ errMsg: 'operateAudio:fail audioInstance is not set', errCode: -1 })
assert.notStrictEqual(app.globalData.audio, original, '失效的原生实例应重建一次')
assert.strictEqual(app.globalData.audio.src, file)
assert.strictEqual(app.globalData.audio.plays, 0)
app.globalData.audio.ready()
assert.strictEqual(app.globalData.audio.plays, 1)
playAudioPath('/assets/audio/hanzi-01-character.mp3')
const ready = app.globalData.audio.ready
stopAudio()
ready()
assert.strictEqual(app.globalData.audio.plays, 1, '离页后到达的就绪事件不能播放')
const phrase = '/assets/audio/hanzi-26-phrase.mp3'
preloadAudioPath(phrase)
const warmed = contexts.at(-1)
assert.strictEqual(warmed.src, phrase)
assert.strictEqual(warmed.plays, 0, '预加载词语不能提前发声')
warmed.ready()
const old = app.globalData.audio
playAudioPath(phrase)
assert.strictEqual(app.globalData.audio, warmed)
assert.strictEqual(warmed.plays, 1, '已准备的词语点击即调用播放，无需再次等就绪事件')
assert.strictEqual(warmed.assignments, 1, '点击预加载录音不能重复设置src导致再次缓冲')
playAudioPath(old.src)
assert.strictEqual(app.globalData.audio, old, '字音和词语切换应复用两个播放器')
preloadAudioPath('/assets/audio/hanzi-28-phrase.mp3')
assert(warmed.destroyed, '换字后释放旧的预加载播放器，避免随浏览累积')
const pending = contexts.at(-1)
playAudioPath(pending.src)
assert.strictEqual(pending.plays, 0)
assert.strictEqual(pending.assignments, 1, '准备中的词语也不能重置加载')
stopAudio()
clearPreloadedAudio()
assert(old.destroyed, '离页应释放备用播放器')
assert.strictEqual(pending.ready, null, '离页后取消尚未准备完成的播放')
console.log('真机音频检查通过：就绪后播放、竹的实例错误恢复及离页取消。')
