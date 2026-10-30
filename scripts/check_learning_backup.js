const assert = require('assert')
const store = new Map()
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
let failKey = ''
global.wx = {
  getStorageSync: key => clone(store.get(key)),
  setStorageSync(key, value) {
    if (key === failKey) { failKey = ''; throw new Error('storage full') }
    store.set(key, clone(value))
  },
  removeStorageSync: key => store.delete(key)
}
const { completeUnit, markUnitUnlearned, getProgress } = require('../utils/progress')
const { encodeBackup, decodeBackup, restoreBackup, undoImport, KEYS, UNDO_KEY } = require('../utils/learning-backup')
store.set(KEYS[0], { completedIds: { 'english-01': true }, stars: 4, stickerCount: 1 })
assert.strictEqual(decodeBackup(encodeBackup()).data[KEYS[0]].lastModuleId, 'hanzi', '旧存档缺少最近学习模块时仍可导出')
store.clear()
assert.strictEqual(decodeBackup(encodeBackup()).data[KEYS[0]].stars, 0, '新设备可以导出空存档')
completeUnit('hanzi-01', 'hanzi')
completeUnit('hanzi-02', 'hanzi')
markUnitUnlearned('hanzi-02', 'hanzi')
store.set(KEYS[1], { autoRead: false, rangeEnabled: true, startId: 'hanzi-01', endId: 'hanzi-02', orderIds: ['hanzi-02', 'hanzi-01'] })
store.set(KEYS[2], { days: { '2026-10-30': { day: '2026-10-30', cards: [{ id: 'hanzi-01', review: true, done: false }], readingId: 'sentence-01', readingDone: false } }, readings: { 'sentence-02': '2026-10-29' }, reviews: {} })
store.set(KEYS[3], { dog: { rounds: 2, firstCorrect: 1, needsReview: true } })
store.set(KEYS[4], { test: { 'test-1-1': 'helped' } })
store.set('unrelated', { keep: true })
const encoded = encodeBackup(new Date('2026-10-30T01:00:00Z'))
const payload = decodeBackup(encoded)
assert.deepStrictEqual(decodeBackup('\uFEFF\n' + encoded + '\n'), payload)
assert.strictEqual(payload.createdAt, '2026-10-30T01:00:00.000Z')
const source = clone(payload.data)
completeUnit('hanzi-03', 'hanzi')
const localBefore = getProgress()
restoreBackup(source)
assert.deepStrictEqual(getProgress(), source[KEYS[0]], '导入应准确替换，不能把未学会的字合并成已学会')
KEYS.forEach(key => assert.deepStrictEqual(store.get(key), source[key]))
assert.deepStrictEqual(store.get('unrelated'), { keep: true })
assert(undoImport())
assert.deepStrictEqual(getProgress(), localBefore)
assert(!store.has(UNDO_KEY))
assert.strictEqual(undoImport(), false)

const target = clone(source)
target[KEYS[1]] = null
restoreBackup(target)
assert(!store.has(KEYS[1]), '来源设备未设定的配置应清除，不残留旧设备设置')
undoImport()
const beforeFailure = clone(Object.fromEntries(store))
failKey = KEYS[2]
assert.throws(() => restoreBackup(source), /已恢复/)
KEYS.forEach(key => assert.deepStrictEqual(store.get(key), beforeFailure[key], '中途存储失败应回滚'))

for (const text of ['', '{}', encoded.slice(0, -10), encoded.replace('CurioCub', 'OtherApp'), encoded.replace('sentence-02', 'sentence-99')]) {
  assert.throws(() => decodeBackup(text), /无法读取|格式/)
}
for (const mutate of [data => { data[KEYS[0]].stars = -1 }, data => { data[KEYS[0]].unlearnedIds['hanzi-01'] = true },
  data => { data[KEYS[2]].days['2026-10-30'].cards = {} }, data => { data[KEYS[4]].test['test-1-1'] = 'unknown' }]) {
  const invalid = clone(source)
  mutate(invalid)
  const before = clone(Object.fromEntries(store))
  assert.throws(() => restoreBackup(invalid))
  assert.deepStrictEqual(Object.fromEntries(store), before, '非法存档不能改动本机记录')
}

let definition, shared, clipboard, modal, chosen
global.Page = page => { definition = page }
Object.assign(wx, {
  env: { USER_DATA_PATH: '/user' },
  getFileSystemManager: () => ({ writeFile: options => { assert(decodeBackup(options.data)); options.success() },
    readFile: options => options.success({ data: encoded }) }),
  shareFileMessage: options => { shared = options; options.complete() },
  chooseMessageFile: options => { chosen = options; options.success({ tempFiles: [{ path: '/received.txt', size: encoded.length }] }) },
  setClipboardData: options => { clipboard = options.data },
  getClipboardData: options => options.success({ data: clipboard }),
  showToast() {}, showModal: options => { modal = options }
})
require('../pages/learning-backup/learning-backup')
const page = { ...definition, data: clone(definition.data), setData(value) { Object.assign(this.data, value) } }
page.onShow()
page.sendFile()
assert(shared.fileName.endsWith('.txt') && !page.data.busy)
const beforePreview = clone(Object.fromEntries(store))
page.chooseFile()
assert(chosen.count === 1 && page.data.pending.learned === 1)
assert.deepStrictEqual(Object.fromEntries(store), beforePreview, '选择文件和预览不应写入')
page.cancelImport()
assert.strictEqual(page.payload, null)
page.chooseFile()
page.importBackup()
assert.deepStrictEqual(getProgress(), source[KEYS[0]], '确认按钮应恢复预览的记录')
assert(page.data.canUndo && !page.data.pending)
page.undo()
modal.success({ confirm: true })
assert.deepStrictEqual(getProgress(), beforePreview[KEYS[0]], '撤销按钮应还原导入前记录')
page.copyText()
assert(decodeBackup(clipboard))
page.pasteText()
assert(page.payload)
page.preview('invalid')
assert.strictEqual(page.payload, null, '错误的新文件应清除旧预览，防止误导入')
assert.strictEqual(page.data.pending, null)
assert(modal)
wx.shareFileMessage = undefined
page.sendFile()
assert(decodeBackup(clipboard), '不支持发文件时应提供文字方式')
console.log('存档检查通过：完整往返、未学会状态、顺序/阅读/英语记录、校验、替换、撤销、失败回滚、文件与文字入口。')
