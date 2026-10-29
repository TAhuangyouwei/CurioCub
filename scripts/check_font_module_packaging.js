const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const { getModule } = require('../data/learning')
const root = path.resolve(__dirname, '..')
const manifest = require('./font-source/hanzi-kai.json')
const config = require('../project.config.json')
global.wx = { getStorageSync: key => key === 'curiocub-hanzi-settings-v1' ? { autoRead: false } : null }
global.getApp = () => ({ globalData: { audio: { stop() {} } } })

// Reproduce the phone's missing-module error, rather than letting Node resolve every local file.
for (const packageName of new Set(getModule('hanzi').items.map(unit => unit.packageName).filter(Boolean))) {
  const entry = path.join(root, `packages/${packageName}/pages/lesson/index.js`)
  const localRequire = createRequire(entry)
  let definition
  const context = {
    require(request) {
      if (request.includes('/fonts/hanzi-kai')) throw new Error(`module '${packageName}/fonts/hanzi-kai.js' is not defined`)
      return localRequire(request)
    },
    Page(value) { definition = value }
  }
  assert.doesNotThrow(() => vm.runInNewContext(fs.readFileSync(entry, 'utf8'), context), '字体模块缺失不能阻止学习页面注册')
  assert(definition)
}
for (const face of manifest.files) {
  assert(config.packOptions.include.some(item => item.type === 'file' && item.value === face.file), `${face.file} 必须明确保留在真机包中`)
}
for (const name of ['today', 'reading']) {
  const entry = path.join(root, `packages/hanzi-practice/pages/${name}/index.js`)
  const localRequire = createRequire(entry)
  let definition
  assert.doesNotThrow(() => vm.runInNewContext(fs.readFileSync(entry, 'utf8'), {
    require(request) {
      if (request.includes('/fonts/hanzi-kai')) throw new Error('module is not defined')
      return localRequire(request)
    },
    Page(value) { definition = value }
  }))
  const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  const originalError = console.error
  console.error = () => {}
  try { assert.doesNotThrow(() => page.onReady()) } finally { console.error = originalError }
  assert.strictEqual(page.data.fontError, true, '今日学习和短句页也不能被字体缺失阻断')
}
// The shared base face must also be optional during page-module evaluation.
const fontModule = { exports: {} }
vm.runInNewContext(fs.readFileSync(path.join(root, 'utils/hanzi-font.js'), 'utf8'), {
  module: fontModule,
  require() { throw new Error('base font module is not defined') },
  console: { error() {} }
})
const basePage = { data: {}, setData(value) { Object.assign(this.data, value) } }
fontModule.exports.loadHanziFont(basePage)
assert.strictEqual(basePage.data.fontError, true)
console.log('字体模块打包检查通过：字体文件明确入包，模拟真机缺失模块仍可注册页面并重试。')
