// Register fonts in this page's webview and reveal characters only after both faces load.
function loadHanziFont(page, extraSource) {
  const request = (page.fontRequest || 0) + 1
  page.fontRequest = request
  page.setData({ fontReady: false, fontError: false })
  const fail = () => {
    if (!page.fontUnloaded && page.fontRequest === request) page.setData({ fontError: true })
  }
  let faces
  try {
    const baseSource = require('../assets/fonts/hanzi-kai.js')
    const source = typeof extraSource === 'function' ? extraSource() : extraSource
    faces = [{ family: 'CurioCubKaiBase', source: baseSource }]
    if (source) faces.push({ family: 'CurioCubKai', source })
  } catch (error) {
    console.error('汉字字体模块加载失败', error)
    fail()
    return
  }
  let remaining = faces.length
  if (typeof wx.loadFontFace !== 'function') { fail(); return }
  faces.forEach((face) => wx.loadFontFace({
    ...face,
    global: false,
    desc: { style: 'normal', weight: '400' },
    success() {
      if (--remaining === 0 && !page.fontUnloaded && page.fontRequest === request && !page.data.fontError) {
        page.setData({ fontReady: true })
      }
    },
    fail
  }))
}

module.exports = { loadHanziFont }
