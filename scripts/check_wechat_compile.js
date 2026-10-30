// Run with the WeChat developer tools' Electron in Node mode to use its actual compiler.
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const root = path.resolve(__dirname, '..')
const toolRoot = process.argv[2] || 'C:/Program Files (x86)/Tencent/微信web开发者工具'
const archive = path.join(toolRoot, 'resources/app.asar')
const toolRequire = createRequire(path.join(archive, 'package.json'))
const es6Compile = toolRequire('./js/common/miniprogram-builder/modules/corecompiler/original/js/es6Transform.js')
const enhanceCompile = toolRequire('./js/common/miniprogram-builder/modules/corecompiler/original/js/enhance.js')
const shared = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
const personal = JSON.parse(fs.readFileSync(path.join(root, 'project.private.config.json'), 'utf8'))
const setting = Object.assign({}, shared.setting, personal.setting)
const compiler = setting.enhance ? enhanceCompile : es6Compile
assert(setting.es6, 'ES6 compatibility compilation must remain enabled')
const storage = new Map([['curiocub-progress-v1', { completedIds: { 'english-01': true }, stars: 4, stickerCount: 1 }]])
const cache = new Map()
const runtimeCache = new Map()
let application
let definition
let compiledCount = 0
let runtimeRequests = 0
const audio = { stop() {}, play() {}, onError() {}, offError() {}, onCanplay() {}, offCanplay() {}, onEnded() {}, offEnded() {} }
const context = vm.createContext({ console, setTimeout, clearTimeout,
  App: app => { application = app }, Page: page => { definition = page }, getApp: () => application,
  wx: { createInnerAudioContext: () => audio, showToast() {}, setNavigationBarTitle() {},
    getStorageSync: key => storage.has(key) ? JSON.parse(JSON.stringify(storage.get(key))) : null,
    setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))) }
})

function execute(code, filename, localRequire, module) {
  const wrapper = vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename })
  wrapper(localRequire, module, module.exports)
  return module.exports
}

function loadRuntime(filename) {
  if (path.basename(filename) === 'defineProperty.js') {
    throw new Error("module '@babel/runtime/helpers/defineProperty.js' is not defined, require args is './defineProperty'")
  }
  if (runtimeCache.has(filename)) return runtimeCache.get(filename).exports
  const module = { exports: {} }
  runtimeCache.set(filename, module)
  const localRequire = createRequire(filename)
  return execute(fs.readFileSync(filename, 'utf8'), filename,
    name => loadRuntime(localRequire.resolve(name)), module)
}

function loadProject(filename) {
  filename = path.extname(filename) ? filename : `${filename}.js`
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  if (filename.endsWith('.json')) {
    module.exports = JSON.parse(fs.readFileSync(filename, 'utf8'))
    return module.exports
  }
  const result = compiler({ code: fs.readFileSync(filename, 'utf8'), filePath: path.relative(root, filename),
    babelRoot: '@babel/runtime', disableUseStrict: false })
  assert(!result.error, result.error && result.error.message)
  compiledCount++
  return execute(result.code, filename, name => {
    if (name.startsWith('@babel/runtime/')) {
      runtimeRequests++
      return loadRuntime(toolRequire.resolve(name))
    }
    assert(name.startsWith('.'), `Unexpected external dependency: ${name}`)
    return loadProject(path.resolve(path.dirname(filename), name))
  }, module)
}

function page(file) {
  loadProject(path.join(root, file))
  return Object.assign({}, definition, { data: JSON.parse(JSON.stringify(definition.data)),
    setData(value) { Object.assign(this.data, value) } })
}

assert.doesNotThrow(() => {
  loadProject(path.join(root, 'app.js'))
  application.onLaunch()
  const home = page('pages/index/index.js')
  home.onShow()
  assert.strictEqual(home.data.modules.length, 4)
  assert.strictEqual(home.data.stars, 4)
  assert(home.data.modules.every(module => Number.isFinite(module.percent)))
  const backup = page('pages/learning-backup/learning-backup.js')
  backup.onShow()
  assert.strictEqual(backup.data.summary.stars, 4)
  const reading = page('packages/hanzi-practice/pages/reading/index.js')
  reading.onLoad({})
  reading.onShow()
  assert.strictEqual(reading.data.tests.length, 10)
  assert.strictEqual(reading.data.sentence, null)
  const modulePage = page('pages/module/module.js')
  for (const moduleId of ['hanzi', 'pinyin', 'math', 'english']) {
    modulePage.onLoad({ moduleId })
    modulePage.onShow()
    assert.strictEqual(modulePage.data.module.id, moduleId)
  }
  const cards = page('packages/english-vocabulary/pages/cards/index.js')
  cards.onLoad()
  assert.strictEqual(cards.data.word.word, 'dog')
  const practice = page('packages/english-vocabulary/pages/listening/index.js')
  practice.onLoad({ topic: 'numbers' })
  practice.onShow()
  practice.start()
  assert.strictEqual(practice.data.total, 5)
  practice.listen()
  practice.choose({ currentTarget: { dataset: { id: practice.currentWord.id } } })
  assert(practice.data.answered)
  practice.next()
  practice.listen()
  const wrong = practice.data.options.find(option => option.id !== practice.currentWord.id)
  practice.choose({ currentTarget: { dataset: { id: wrong.id } } })
  assert(storage.get('curiocub-english-listening-v1')[practice.currentWord.id].needsReview)
}, '编译后的首页和英语页面应能在缺少外置 defineProperty 辅助模块时正常启动')
assert.strictEqual(runtimeRequests, 0, '页面启动不应依赖微信未提供的 Babel 辅助模块')
console.log(`微信实际编译器检查通过：${compiledCount} 个依赖模块，首页、存档、阶段阅读、英语地图、词卡及听图复习均正常。`)
