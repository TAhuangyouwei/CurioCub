const assert = require('assert')
const fs = require('fs')
const { loadHanziFont } = require('../utils/hanzi-font')
let requests = []
global.wx = { loadFontFace(options) { requests.push(options) } }
function page() {
  return { data: {}, setData(changes) { Object.assign(this.data, changes) } }
}
const main = page()
loadHanziFont(main)
assert.strictEqual(main.data.fontReady, false, '加载完成前不能显示回退字体')
assert.strictEqual(requests.length, 1)
assert(requests[0].source.startsWith('url("data:font/woff2;base64,'))
assert.strictEqual(requests[0].global, false, '每个页面必须等待自己的 webview 字体就绪')
requests.shift().success()
assert.strictEqual(main.data.fontReady, true)

const extra = require('../packages/hanzi-extra/fonts/hanzi-kai')
const sub = page()
loadHanziFont(sub, extra)
assert.strictEqual(requests.length, 2)
assert.strictEqual(requests[1].source, extra)
requests[1].success()
assert.strictEqual(sub.data.fontReady, false, '分包字形和主包字形必须都准备好')
requests[0].success()
assert.strictEqual(sub.data.fontReady, true)
requests = []
loadHanziFont(sub, extra)
const stale = requests
requests[0].fail()
requests[1].success()
assert.strictEqual(sub.data.fontReady, false)
assert.strictEqual(sub.data.fontError, true)
requests = []
loadHanziFont(sub, extra)
stale[0].fail()
requests.forEach(request => request.success())
assert.strictEqual(sub.data.fontReady, true, '重试不受旧请求回调影响')
assert.strictEqual(sub.data.fontError, false)
requests = []
const closed = page()
loadHanziFont(closed)
closed.fontUnloaded = true
requests[0].success()
assert.strictEqual(closed.data.fontReady, false, '退出后不再更新页面')

const lesson = fs.readFileSync('pages/lesson/lesson.wxml', 'utf8')
assert(lesson.includes("isHanzi && !item.resourceReady"), '相邻分包卡片不能露出普通字体')
for (const name of ['today', 'reading']) {
  const template = fs.readFileSync(`packages/hanzi-practice/pages/${name}/index.wxml`, 'utf8')
  assert(template.includes("fontReady ? 'visible' : 'hidden'"))
  assert(template.includes('bindtap="loadFont"'))
}
assert(lesson.includes('bindtap="loadFont"'))
// Actual lesson loading is exercised by check_lesson_buffer.js.
console.log('字体加载检查通过：等待就绪、主分包字形、失败重试、过期回调、退出页面及显示条件。')
