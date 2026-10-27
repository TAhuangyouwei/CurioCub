const assert = require('assert')

const player = {
  src: '',
  playCount: 0,
  play() { this.playCount += 1 },
  stop() {},
  onError(listener) { this.errorListener = listener },
  offError() { this.errorListener = null },
  onCanplay(listener) { this.canPlayListener = listener },
  offCanplay() { this.canPlayListener = null },
  onEnded(listener) { this.endedListener = listener },
  offEnded() { this.endedListener = null },
  finish() { if (this.endedListener) this.endedListener() }
}

let pageDefinition = null
global.getApp = () => ({ globalData: { audio: player } })
let redirectedTo = ''
global.wx = {
  redirectTo({ url }) { redirectedTo = url },
  showToast() {}
}

const { createPinyinBuilderPage } = require('../pages/pinyin-builder/pinyin-builder')
pageDefinition = createPinyinBuilderPage()

const page = {
  ...pageDefinition,
  route: 'packages/pinyin-04/pages/builder/index',
  data: JSON.parse(JSON.stringify(pageDefinition.data)),
  setData(changes, callback) {
    Object.assign(this.data, changes)
    if (callback) callback()
  }
}

async function main() {
  page.onLoad({ tone: '3' })
  page.readAloud()
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-h.mp3', '两拼应先播放声母')
  player.finish()
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-ao-3.mp3', '两拼第二步应播放带声调韵母')
  player.finish()
  assert.strictEqual(player.src, '/packages/pinyin-04/audio/hao3.mp3', '两拼最后应播放完整音节')
  player.finish()
  assert.strictEqual(player.playCount, 3, '完整两拼应依次播放三段声音')

  page.selectInitial({ currentTarget: { dataset: { value: 'b' } } })
  await new Promise((resolve) => setImmediate(resolve))
  assert.strictEqual(page.data.selectedInitial, 'b', '点击声母后应更新选中状态')
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-b.mp3', '点击声母应播放主包内的对应音频')
  assert.strictEqual(player.playCount, 4, '点击声母应实际调用播放器')

  page.selectFinal({ currentTarget: { dataset: { value: 'a' } } })
  await new Promise((resolve) => setImmediate(resolve))
  assert.strictEqual(page.data.selectedFinal, 'a', '点击韵母后应更新选中状态')
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-a.mp3', '点击韵母固定播放一声基础音，拼读时再带所选声调')
  assert.strictEqual(player.playCount, 5, '点击韵母应实际调用播放器')

  page.readAloud()
  assert(redirectedTo.startsWith('/packages/pinyin-01/pages/builder/index?'), '跨声母分包时应进入对应拼读页面')
  assert(redirectedTo.includes('initial=b'), '切换分包时应保留所选声母')
  assert(redirectedTo.includes('final=a'), '切换分包时应保留所选韵母')
  assert(redirectedTo.includes('sequence=1'), '跨分包后应继续分步拼读')

  const targetDefinition = createPinyinBuilderPage()
  const targetPage = {
    ...targetDefinition,
    route: 'packages/pinyin-01/pages/builder/index',
    data: JSON.parse(JSON.stringify(targetDefinition.data)),
    setData(changes, callback) {
      Object.assign(this.data, changes)
      if (callback) callback()
    }
  }
  targetPage.onLoad({ mode: 'two', initial: 'b', final: 'a', tone: '3', autoPlay: 'ba3', sequence: '1' })
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-b.mp3', '切换分包后应从声母开始拼读')
  player.finish()
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-a-3.mp3', '切换分包后应继续播放带声调韵母')
  player.finish()
  assert.strictEqual(player.src, '/packages/pinyin-01/audio/ba3.mp3', '切换分包后应以完整音节结束')

  const threeDefinition = createPinyinBuilderPage()
  const threePage = {
    ...threeDefinition,
    route: 'packages/pinyin-04/pages/builder/index',
    data: JSON.parse(JSON.stringify(threeDefinition.data)),
    setData(changes, callback) {
      Object.assign(this.data, changes)
      if (callback) callback()
    }
  }
  threePage.onLoad({ mode: 'three', initial: 'h', medial: 'u', ending: 'a', tone: '1' })
  threePage.readAloud()
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-h.mp3', '三拼应先播放声母')
  player.finish()
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-u.mp3', '三拼第二步应播放介母')
  player.finish()
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/final-a-1.mp3', '三拼第三步应播放带声调韵母')
  player.finish()
  assert.strictEqual(player.src, `/packages/pinyin-04/audio/${threePage.data.example.key}.mp3`, '三拼最后应播放完整音节')

  const beforeD = player.playCount
  page.selectInitial({ currentTarget: { dataset: { value: 'd' } } })
  assert.strictEqual(page.data.selectedInitial, 'd')
  assert.strictEqual(player.src, '/assets/audio/pinyin-basic/initial-d.mp3', 'd 按键应播放修复后的本地录音')
  assert.strictEqual(player.playCount, beforeD + 1)

  console.log('拼音按键交互检查通过：d 按键、两拼/三拼分步发音和跨分包续播均正常。')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
