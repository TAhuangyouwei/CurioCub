const assert = require('assert')
const { decodeBackup } = require('../utils/learning-backup')
const store = new Map(), files = new Map(), dialogs = []
let definition, clipboard = '', failure = { errMsg: 'shareFileMessage:fail test native rejection', errno: 102 }
let inTap = false, requireTap = false, shareCalls = 0, writes = 0, writeFailure = false, diskCalls = 0
global.Page = page => { definition = page }
global.wx = {
  env: { USER_DATA_PATH: '/user' }, getStorageSync: key => store.get(key),
  getDeviceInfo: () => ({ platform: 'windows' }),
  getFileSystemManager: () => ({
    writeFile(options) { files.set(options.filePath, options.data); writes++; options.success() },
    writeFileSync(path, content, encoding) {
      if (writeFailure) throw new Error('disk full')
      assert.strictEqual(encoding, 'utf8'); files.set(path, content); writes++
    }
  }),
  shareFileMessage(options) {
    shareCalls++
    if (requireTap) assert(inTap, '分享调用必须直接来自按钮点击，不能等待异步回调')
    assert(decodeBackup(files.get(options.filePath)))
    if (failure) options.fail(failure)
    else if (options.success) options.success({ errMsg: 'shareFileMessage:ok' })
    options.complete()
  },
  setClipboardData(options) { clipboard = options.data; if (options.success) options.success() },
  showToast() {}, showModal: options => dialogs.push(options),
  saveFileToDisk(options) { diskCalls++; assert(decodeBackup(files.get(options.filePath))); options.success(); options.complete() }
}
require('../pages/learning-backup/learning-backup')
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(value) { Object.assign(this.data, value) } }
page.onShow()
page.sendFile()
assert(page.data.exportError && page.data.exportError.includes('test native rejection'), '不能把微信的真实报错替换成一句笼统提示')
assert(page.data.exportError.includes('102'))
assert(!page.data.busy)
assert.strictEqual(dialogs.at(-1).confirmText, '复制存档')
assert.strictEqual(clipboard, '', '失败时应由用户选择是否复制，不能假装已经发出')
dialogs.at(-1).success({ confirm: true })
assert(decodeBackup(clipboard))

failure = null; requireTap = true; inTap = true
page.sendFile(); inTap = false
assert(!page.data.exportError && !page.data.busy)
assert(page.data.transferHint.includes('已发送'))
const count = dialogs.length
failure = { errMsg: 'shareFileMessage:fail cancel' }; inTap = true
page.sendFile(); inTap = false
assert.strictEqual(dialogs.length, count, '主动取消不应弹失败提示或改剪贴板')
assert(!page.data.busy && !page.data.exportError)

writeFailure = true
const before = shareCalls
page.sendFile()
assert.strictEqual(shareCalls, before, '文件写入失败不能调用发送接口')
assert(page.data.exportError.includes('disk full') && !page.data.busy)
writeFailure = false
page.data.busy = true
const beforeWrites = writes
page.sendFile(); assert.strictEqual(writes, beforeWrites, '发送过程中应防止重复点击')
page.data.busy = false
wx.shareFileMessage = undefined
page.sendFile()
assert.strictEqual(dialogs.at(-1).confirmText, '复制存档')
dialogs.at(-1).success({ confirm: true }); assert(decodeBackup(clipboard))
assert(page.data.canSaveFile)
page.saveFile(); assert.strictEqual(diskCalls, 1)
wx.getDeviceInfo = () => ({ platform: 'ios' })
page.onShow(); assert(!page.data.canSaveFile, '手机上不展示仅电脑可用的保存按钮')
console.log('存档传递检查通过：原始报错、按钮直接发送、成功/取消/写盘失败、忙碌保护、文字兜底与电脑保存。')
