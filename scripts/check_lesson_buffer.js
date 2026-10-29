const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const root = path.resolve(__dirname, '..')
const downloads = []
const images = []
const faces = []
const navigations = []
let definition
let resolveImmediately = false
let failFontModule = false
let allowEntryRedirect = false
const store = new Map()
const nativeAudio = { stop() {} }
global.getApp = () => ({ globalData: { audio: nativeAudio } })
global.wx = {
  getStorageSync: key => key === 'curiocub-hanzi-settings-v1' ? { ...store.get(key), autoRead: false } : store.get(key),
  setStorageSync: (key, value) => store.set(key, value),
  getImageInfo(request) { images.push(request); if (resolveImmediately) request.success({ path: request.src.replace(/^\//, '') }) },
  loadFontFace(request) { faces.push(request); request.success() },
  navigateTo(request) { navigations.push(request) },
  redirectTo(request) { if (!allowEntryRedirect) throw new Error('学习期间不能整页跳转'); navigations.push(request) },
  showLoading() {}, hideLoading() {}, showToast() {}
}
function load(file, overrides = {}) {
  const filename = path.join(root, file)
  const local = createRequire(filename)
  const requireMock = (request, success, fail) => {
    if (!success) return overrides[request] || local(request)
    const name = request.match(/packages\/([^/]+)/)[1]
    downloads.push({ name })
    Promise.resolve().then(() => {
      if (failFontModule) throw new Error('module is not defined')
      return local(request)
    }).then(success, fail)
  }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: requireMock, module, wx, console, getApp,
    Page(value) { definition = value } }, { filename })
  return module.exports
}
const resources = load('utils/lesson-resources.js')
const start = load('utils/start-lesson.js', { './lesson-resources': resources })
const { createLessonPage } = load('pages/lesson/lesson-page.js', { '../../utils/lesson-resources': resources })
const { orderedHanzi } = require('../utils/hanzi-settings')
const units = orderedHanzi()
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
function resolveImages() { images.filter(request => !request.done).forEach(request => { request.done = true; request.success({ path: request.src.replace(/^\//, '') }) }) }
function instance() {
  const page = createLessonPage()
  return { ...page, data: { ...page.data }, setData(changes, callback) {
    for (const [key, value] of Object.entries(changes)) {
      const match = key.match(/^lessonItems\[(\d+)\]$/)
      if (match) this.data.lessonItems[Number(match[1])] = value
      else this.data[key] = value
    }
    if (callback) callback()
  } }
}
;(async () => {
  const parent = {}
  const entering = start.startHanziLesson(parent, units[0])
  assert.strictEqual(start.startHanziLesson(parent, units[0]), entering, '连点开始只准备一次')
  await tick()
  assert.strictEqual(images.length, 2, '进页前只准备两个字')
  assert.strictEqual(navigations.length, 0, '两个字准备好之前留在入口')
  resolveImages()
  await entering
  assert.strictEqual(navigations.length, 1)
  assert(navigations[0].url.startsWith('/pages/lesson/lesson?'))
  const page = instance()
  page.onLoad({ moduleId: 'hanzi', unitId: units[0].id })
  assert(page.data.fontReady, '首屏用已经准备好的字体直接显示')
  assert.strictEqual(page.data.unit.imageFile, units[0].imageFile, '预加载返回不带根目录的路径时，提示图片仍须使用原始绝对路径')
  page.onReady()
  await tick()
  assert.strictEqual(images.length, 5, '进页后再后台补三个字')
  resolveImages()
  await tick()
  const firstFontCount = faces.length
  const next = page.onCardChange({ detail: { current: 1 } })
  await tick()
  assert.strictEqual(images.length, 6, '滑动一个字只新增一个储备字')
  assert(page.data.fontReady, '储备命中时不能再次隐藏大字')
  resolveImages()
  await next
  assert.strictEqual(faces.length, firstFontCount, '同包换字不能重新加载字体')
  const beforeReverse = images.length
  await page.onCardChange({ detail: { current: 0 } })
  assert.strictEqual(images.length, beforeReverse, '反向看已准备的字不重复预备')
  resolveImmediately = true
  const boundary = units.findIndex((unit, i) => i > 0 && unit.packageName !== units[i - 1].packageName)
  await page.onCardChange({ detail: { current: boundary - 1 } })
  const fontCount = faces.length
  await page.onCardChange({ detail: { current: boundary } })
  assert.strictEqual(page.data.unit.id, units[boundary].id)
  assert.strictEqual(page.data.fontReady, true, '没有 wx.loadSubpackage 的真机也要准备好跨包字体')
  assert.strictEqual(page.data.unit.imageFile, units[boundary].imageFile, '跨分包的提示图片也应保留完整根目录路径')
  assert.strictEqual(navigations.length, 1, '跨包仍然在同一个学习页面')
  assert.strictEqual(faces.length, fontCount, '边界字体应已在储备时加载')
  assert(faces.every(face => face.global && face.scopes.includes('webview')))
  assert.strictEqual(new Set(downloads.map(request => request.name)).size, downloads.length, '并发预备同包时只下载一次')
  const count = images.length
  await resources.prepareAhead(units, units.length - 1, 5, false)
  assert.strictEqual(images.length - count, 1, '最后一个字不能越界补货')
  await resources.prepareAhead(units.slice(0, 2), 1, 5, true)
  assert.strictEqual(images.length - count, 1, '短范围循环不重复加载')
  const unloaded = units.find(unit => unit.packageName && !faces.some(face => face.family === `CurioCubKai_${unit.packageName.replace(/-/g, '_')}`))
  failFontModule = true
  const failingPage = instance()
  failingPage.onLoad({ moduleId: 'hanzi', unitId: unloaded.id })
  const logError = console.error
  console.error = () => {}
  try { await failingPage.loadFont() } finally { console.error = logError }
  assert(failingPage.data.unit, '字体模块缺失不能变成整页白屏')
  assert.strictEqual(failingPage.data.fontError, true)
  failFontModule = false
  await failingPage.loadFont()
  assert.strictEqual(failingPage.data.fontReady, true, '失败不能污染缓存，重试应能恢复')
  failingPage.onUnload()
  page.onUnload()
  await start.startHanziLesson({}, units[300])
  assert.strictEqual(navigations.length, 2, '从分包中的字开始学习也不需要 wx.loadSubpackage')
  assert(navigations[1].url.includes(units[300].id))
  load('pages/learning-range/learning-range.js', { '../../utils/start-lesson': start })
  const range = { ...definition, data: { ...definition.data }, setData(changes) { Object.assign(this.data, changes) } }
  range.onLoad()
  range.selectCharacter({ currentTarget: { dataset: { index: 320 } } })
  range.selectCharacter({ currentTarget: { dataset: { index: 321 } } })
  allowEntryRedirect = true
  await range.saveAndStart()
  assert.strictEqual(navigations.length, 3, '保存并开始学习也应正常进入')
  assert(navigations[2].url.includes(units[320].id))
  console.log('字卡储备检查通过：入页先两字、后台再三字、滑动补一字、字体缓存、跨包不刷新及首尾循环。')
})().catch(error => { console.error(error); process.exitCode = 1 })
