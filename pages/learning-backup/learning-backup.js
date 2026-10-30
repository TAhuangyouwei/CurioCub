const { encodeBackup, decodeBackup, restoreBackup, undoImport, describe, UNDO_KEY, MAX_LENGTH } = require('../../utils/learning-backup')

function localTime(value) {
  const date = new Date(value)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
Page({
  data: { summary: {}, pending: null, pendingTime: '', text: '', showText: false, canUndo: false, busy: false,
    exportError: '', transferHint: '', canSaveFile: false },
  onShow() { this.refresh() },
  refresh() {
    const info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}
    this.setData({ summary: describe(decodeBackup(encodeBackup()).data), canUndo: Boolean(wx.getStorageSync(UNDO_KEY)),
      canSaveFile: ['windows', 'mac'].includes(info.platform) && typeof wx.saveFileToDisk === 'function' })
  },
  error(error) { wx.showModal({ title: '暂时没能完成', content: error.message || '请重试，或使用下方的存档文字', showCancel: false }) },
  writeBackupFile(content) {
    const filePath = `${wx.env.USER_DATA_PATH}/CurioCub-save.txt`
    // Keep the native send/save call in the button's own call stack. The backup is small.
    wx.getFileSystemManager().writeFileSync(filePath, content, 'utf8')
    return filePath
  },
  exportFailed(message, error, content) {
    const detail = error.errMsg || error.message || '微信未返回具体原因'
    const code = error.errno !== undefined ? error.errno : error.errCode
    this.setData({ busy: false, exportError: `${detail}${code !== undefined ? `（错误码 ${code}）` : ''}`.slice(0, 800) })
    wx.showModal({ title: '文件没能发出', content: `${message}可以复制存档文字，粘贴到微信“文件传输助手”继续传递。具体原因已显示在页面上。`,
      confirmText: '复制存档', cancelText: '暂不复制',
      success: result => { if (result.confirm) this.copyText(content) }
    })
  },
  sendFile() {
    if (this.data.busy) return
    this.setData({ busy: true, exportError: '', transferHint: '' })
    let content
    try {
      content = encodeBackup()
      if (typeof wx.shareFileMessage !== 'function') {
        this.exportFailed('当前微信没有文件发送功能。', new Error('当前微信未提供 shareFileMessage'), content)
        return
      }
      const filePath = this.writeBackupFile(content)
      wx.shareFileMessage({ filePath, fileName: 'CurioCub-save.txt',
        success: () => this.setData({ transferHint: '存档已发送，请在接收设备选择收到的存档文件并核对。' }),
        fail: error => { if (!/cancel/i.test(error.errMsg || '')) this.exportFailed('微信未能完成文件发送。', error, content) },
        complete: () => this.setData({ busy: false })
      })
    } catch (error) {
      this.setData({ busy: false })
      if (content) this.exportFailed('文件未能准备或发送。', error, content)
      else this.error(error)
    }
  },
  saveFile() {
    if (this.data.busy || !this.data.canSaveFile) return
    this.setData({ busy: true, exportError: '', transferHint: '' })
    let content
    try {
      content = encodeBackup()
      const filePath = this.writeBackupFile(content)
      wx.saveFileToDisk({ filePath,
        success: () => this.setData({ transferHint: '存档已保存到电脑。请在微信中选择这个文件，发送到“文件传输助手”。' }),
        fail: error => { if (!/cancel/i.test(error.errMsg || '')) this.exportFailed('文件未能保存到电脑。', error, content) },
        complete: () => this.setData({ busy: false })
      })
    } catch (error) {
      this.setData({ busy: false })
      if (content) this.exportFailed('文件未能保存到电脑。', error, content)
      else this.error(error)
    }
  },
  copyText(text) {
    try { wx.setClipboardData({ data: typeof text === 'string' ? text : encodeBackup(),
      success: () => this.setData({ transferHint: '存档文字已复制。去微信粘贴并发送完整文字；另一台设备复制后，用“存档文字恢复”。' }),
      fail: () => this.error(new Error('复制失败，请重试')) }) }
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
