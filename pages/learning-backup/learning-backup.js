const { encodeBackup, decodeBackup, restoreBackup, undoImport, describe, UNDO_KEY, MAX_LENGTH } = require('../../utils/learning-backup')

function localTime(value) {
  const date = new Date(value)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
Page({
  data: { summary: {}, pending: null, pendingTime: '', text: '', showText: false, canUndo: false, busy: false },
  onShow() { this.refresh() },
  refresh() {
    this.setData({ summary: describe(decodeBackup(encodeBackup()).data), canUndo: Boolean(wx.getStorageSync(UNDO_KEY)) })
  },
  error(error) { wx.showModal({ title: '暂时没能完成', content: error.message || '请重试，或使用下方的存档文字', showCancel: false }) },
  sendFile() {
    if (this.data.busy) return
    if (!wx.shareFileMessage) { this.copyText(); return }
    this.setData({ busy: true })
    try {
      const filePath = `${wx.env.USER_DATA_PATH}/CurioCub-save.txt`
      const content = encodeBackup()
      const date = new Date().toISOString().replace(/[:.]/g, '-')
      wx.getFileSystemManager().writeFile({ filePath, data: content, encoding: 'utf8',
        success: () => wx.shareFileMessage({ filePath, fileName: `CurioCub-学习存档-${date}.txt`,
          fail: error => { if (!/cancel/.test(error.errMsg || '')) this.error(new Error('当前微信无法发送文件，请使用“复制存档文字”')) },
          complete: () => this.setData({ busy: false }) }),
        fail: () => { this.setData({ busy: false }); this.error(new Error('文件保存失败，请使用“复制存档文字”')) }
      })
    } catch (error) { this.setData({ busy: false }); this.error(error) }
  },
  copyText() {
    try { wx.setClipboardData({ data: encodeBackup(), fail: () => this.error(new Error('复制失败，请重试')) }) }
    catch (error) { this.error(error) }
  },
  chooseFile() {
    this.cancelImport()
    if (!wx.chooseMessageFile) { this.setData({ showText: true }); return }
    wx.chooseMessageFile({ count: 1, type: 'file',
      success: result => {
        const file = result.tempFiles[0]
        if (!file || file.size > MAX_LENGTH) { this.error(new Error('请选择小于 1 MB 的学习存档文件')); return }
        wx.getFileSystemManager().readFile({ filePath: file.path, encoding: 'utf8',
          success: result => this.preview(result.data), fail: () => this.error(new Error('文件读取失败，请重新选择')) })
      }, fail: error => { if (!/cancel/.test(error.errMsg || '')) this.error(new Error('当前微信无法选择文件，请使用存档文字恢复')) }
    })
  },
  preview(text) {
    this.payload = null
    this.setData({ pending: null })
    try {
      this.payload = decodeBackup(text)
      this.setData({ pending: describe(this.payload.data), pendingTime: localTime(this.payload.createdAt) })
    } catch (error) { this.error(error) }
  },
  toggleText() { this.setData({ showText: !this.data.showText }) },
  changeText(event) { this.setData({ text: event.detail.value }) },
  previewText() { this.preview(this.data.text) },
  pasteText() {
    this.cancelImport()
    wx.getClipboardData({ success: result => { this.setData({ text: result.data }); this.preview(result.data) },
      fail: () => this.error(new Error('请长按输入框，粘贴收到的完整存档文字')) })
  },
  cancelImport() { this.payload = null; this.setData({ pending: null }) },
  importBackup() {
    if (!this.payload || this.data.busy) return
    try {
      restoreBackup(this.payload.data)
      this.cancelImport()
      this.setData({ text: '' })
      this.refresh()
      wx.showToast({ title: '学习记录已恢复', icon: 'success' })
    } catch (error) { this.error(error) }
  },
  undo() {
    wx.showModal({ title: '撤销上次导入？', content: '恢复为上次导入前的本机记录。导入之后在本机的学习记录也会撤销。',
      success: result => {
        if (!result.confirm) return
        try { if (undoImport()) { this.cancelImport(); this.refresh(); wx.showToast({ title: '已恢复原记录', icon: 'success' }) } }
        catch (error) { this.error(error) }
      }
    })
  }
})
