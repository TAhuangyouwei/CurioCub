const assert = require('assert')
const fs = require('fs')
const path = require('path')
let definition, platform = 'windows', offset = 0, nodeAvailable = true, target = ''
const calls = [], toasts = []
global.Component = value => { definition = value }
global.wx = {
  getDeviceInfo: () => ({ platform }), getWindowInfo: () => ({ windowHeight: 600 }),
  pageScrollTo: options => { calls.push(options); offset = options.scrollTop },
  showToast: options => toasts.push(options),
  createSelectorQuery() {
    let viewport = false
    return { select(selector) { target = selector; return this }, fields(options) { assert(options.node && options.scrollOffset && options.size); return this },
      selectViewport() { viewport = true; return this }, scrollOffset() { return this },
      exec(callback) { callback(viewport ? [{ scrollTop: offset }] : [{ scrollTop: offset, height: 500,
        node: nodeAvailable ? { scrollTo(options) { calls.push(options); offset = options.top } } : null }]) }
    }
  }
}
require('../components/desktop-scroll/desktop-scroll')
function instance(selector = '') {
  const component = { ...definition.methods, data: { desktop: false, target: selector }, setData(value) { Object.assign(this.data, value) } }
  definition.lifetimes.attached.call(component)
  return component
}
const click = direction => ({ currentTarget: { dataset: { direction } } })
const inner = instance('.module-page')
assert(inner.data.desktop)
inner.scroll(click(1))
assert.strictEqual(target, '.module-page')
assert.strictEqual(offset, 400, '内层站点列表向下移动 80% 可视高度，保留上下文')
inner.scroll(click(1)); assert.strictEqual(offset, 800)
inner.scroll(click(-1)); assert.strictEqual(offset, 400)
inner.scroll(click(-1)); inner.scroll(click(-1)); assert.strictEqual(offset, 0)
inner.data.target = '#order-destination-scroll'
inner.scroll(click(1)); assert.strictEqual(target, '#order-destination-scroll', '弹窗打开时操作弹窗列表，不能误滚背景')
nodeAvailable = false
const before = calls.length
inner.scroll(click(1)); assert.strictEqual(calls.length, before)
assert(toasts.length)
nodeAvailable = true; offset = 100
const page = instance()
page.scroll(click(1)); assert.strictEqual(offset, 580, '普通页面也能无需滚轮向下翻页')
page.scroll(click(-1)); page.scroll(click(-1)); assert.strictEqual(offset, 0)
for (const mobile of ['ios', 'android', 'ohos']) {
  platform = mobile
  const phone = instance('.module-page')
  assert(!phone.data.desktop)
  const before = calls.length
  phone.scroll(click(1)); assert.strictEqual(calls.length, before, '手机端不显示或触发电脑翻页控制')
}
platform = 'mac'; assert(instance().data.desktop)
const app = require('../app.json')
assert.strictEqual(app.usingComponents['desktop-scroll'], '/components/desktop-scroll/desktop-scroll')
const routes = app.pages.concat(app.subpackages.flatMap(pack => pack.pages.map(page => `${pack.root}/${page}`)))
for (const route of routes) {
  const file = path.join(__dirname, '..', route + '.wxml')
  const text = fs.readFileSync(file, 'utf8')
  for (const tag of text.match(/<scroll-view\b[^>]*>/g) || []) {
    assert(tag.includes('enhanced="{{true}}"') && tag.includes('show-scrollbar="{{true}}"'), `${route} 应允许显示滚动条`)
  }
}
assert(fs.readFileSync(path.join(__dirname, '../pages/learning-backup/learning-backup.wxml'), 'utf8').includes('<desktop-scroll />'))
console.log('电脑滚动检查通过：Windows/Mac、内层列表和整页翻动、上下边界、弹窗目标、移动端隔离与全部长列表滚动条。')
