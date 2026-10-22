const assert = require('assert')

const player = {
  src: '',
  playCount: 0,
  stopCount: 0,
  errorListener: null,
  canPlayListener: null,
  endedListener: null,
  play() { this.playCount += 1 },
  stop() { this.stopCount += 1 },
  onError(listener) { this.errorListener = listener },
  offError(listener) { if (this.errorListener === listener) this.errorListener = null },
  onCanplay(listener) { this.canPlayListener = listener },
  offCanplay(listener) { if (this.canPlayListener === listener) this.canPlayListener = null },
  onEnded(listener) { this.endedListener = listener },
  offEnded(listener) { if (this.endedListener === listener) this.endedListener = null },
  finish() { if (this.endedListener) this.endedListener() }
}

global.getApp = () => ({ globalData: { audio: player } })
global.wx = { showToast() {} }

const { playAudio, playAudioPath, playAudioSequence, stopAudio } = require('../utils/audio')

assert(playAudio('hanzi-01-character.mp3'), '首次点击应启动课程音频')
assert.strictEqual(player.src, '/assets/audio/hanzi-01-character.mp3', '课程音频路径错误')
assert.strictEqual(player.playCount, 1, '首次点击应播放一次')
const firstErrorListener = player.errorListener

assert(playAudioPath('/assets/audio/pinyin-basic/initial-b.mp3'), '切换后应启动拼音音频')
assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-b.mp3', '拼音音频路径错误')
assert.strictEqual(player.playCount, 2, '连续点击应各播放一次')
assert.notStrictEqual(player.errorListener, firstErrorListener, '切换音频时应替换错误监听')

assert(playAudioSequence(['/audio/one.mp3', '/audio/two.mp3', '/audio/result.mp3']), '拼读序列应成功启动')
assert.strictEqual(player.src, '/audio/one.mp3', '拼读序列应先播放第一段')
player.finish()
assert.strictEqual(player.src, '/audio/two.mp3', '第一段结束后应播放第二段')
player.finish()
assert.strictEqual(player.src, '/audio/result.mp3', '最后应播放完整结果')
player.finish()
assert.strictEqual(player.endedListener, null, '拼读序列结束后应清理结束监听')

stopAudio()
assert.strictEqual(player.errorListener, null, '停止播放后不应残留错误监听')
assert.strictEqual(player.canPlayListener, null, '停止播放后不应残留就绪监听')
assert.strictEqual(player.endedListener, null, '停止播放后不应残留结束监听')
assert.strictEqual(player.stopCount, 6, '首次播放、切换、序列播放和停止均应终止上一状态')

const sequenceContexts = []
global.wx.createInnerAudioContext = () => {
  const context = {
    _src: '',
    playCount: 0,
    stop() {},
    destroy() { this.destroyed = true },
    play() { this.playCount += 1 },
    onError(listener) { this.errorListener = listener },
    offError() { this.errorListener = null },
    onCanplay(listener) { this.canPlayListener = listener },
    offCanplay() { this.canPlayListener = null },
    onEnded(listener) { this.endedListener = listener },
    offEnded() { this.endedListener = null },
    finish() { if (this.endedListener) this.endedListener() },
    set src(value) {
      this._src = value
      if (this.canPlayListener) this.canPlayListener()
    },
    get src() { return this._src }
  }
  sequenceContexts.push(context)
  return context
}

assert(playAudioSequence([
  '/audio/initial.mp3',
  '/audio/final-3.mp3',
  '/audio/result.mp3'
]), '真机播放应预加载全部分步音频')
assert.strictEqual(sequenceContexts.length, 3, '分步拼读应为每段声音建立预加载播放器')
assert.strictEqual(sequenceContexts[0].playCount, 1, '第一段准备后应立即播放')
assert.strictEqual(sequenceContexts[1].playCount, 0, '第二段不应提前播放')
sequenceContexts[0].finish()
assert.strictEqual(sequenceContexts[1].playCount, 1, '第一段结束后应立即播放已加载的第二段')
sequenceContexts[1].finish()
assert.strictEqual(sequenceContexts[2].playCount, 1, '第二段结束后应立即播放完整音节')
sequenceContexts[2].finish()
assert(sequenceContexts.every((context) => context.destroyed), '分步拼读结束后应释放播放器')

console.log('音频播放器检查通过：单段播放、预加载连续拼读、停止及监听清理均正常。')
