const assert = require('assert')
const fs = require('fs')
const path = require('path')

const lessonTemplate = fs.readFileSync(path.join(__dirname, '..', 'pages', 'lesson', 'lesson.wxml'), 'utf8')
assert(!/<button[^>]*hint-button/.test(lessonTemplate), '提示入口不应使用带默认尺寸的原生 button')
assert(/<view[^>]*[\s\S]*?hint-button/.test(lessonTemplate), '提示入口应使用可控尺寸的 view')

let pageDefinition = null
global.Page = (definition) => { pageDefinition = definition }
global.getApp = () => ({ globalData: { audio: { stop() {} }, lessonRequest: null } })
let navigation = null
global.wx = {
  getStorageSync(key) { return key === 'curiocub-hanzi-settings-v1' ? { autoRead: false } : null },
  setStorageSync() {},
  showToast() {},
  reLaunch() {},
  navigateTo() {},
  navigateBack(options) { navigation = { method: 'navigateBack', options } },
  redirectTo(options) { navigation = { method: 'redirectTo', options } }
}

require('../pages/lesson/lesson')
assert(pageDefinition, '学习卡片页面未注册')

const page = {
  ...pageDefinition,
  data: JSON.parse(JSON.stringify(pageDefinition.data)),
  setData(changes, callback) {
    Object.assign(this.data, changes)
    if (callback) callback()
  }
}

page.onLoad({ moduleId: 'hanzi', unitId: 'hanzi-01' })
assert.strictEqual(page.data.hintVisible, false, '进入新文字时图片应默认隐藏')
page.showHint({ currentTarget: { dataset: { unitId: 'hanzi-01' } } })
assert.strictEqual(page.data.hintVisible, true, '点击提示后应显示图片')
page.setCurrentCard(1)
assert.strictEqual(page.data.unit.id, 'hanzi-02', '应切换到下一张文字卡')
assert.strictEqual(page.data.hintVisible, false, '切换文字后提示图片应重新隐藏')
page.returnToModule()
assert.strictEqual(navigation.method, 'navigateBack', '学习页返回键应返回上一层模块地图')
assert.strictEqual(navigation.options.delta, 1, '学习页返回键只应返回一层')

console.log('学习页检查通过：提示状态正确，返回键回到上一层模块地图。')
