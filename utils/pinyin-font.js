const source = require('../assets/fonts/pinyin-hand')

function loadPinyinFont(page) {
  if (page.pinyinFontLoaded || page.pinyinFontLoading || typeof wx.loadFontFace !== 'function') return
  page.pinyinFontLoading = true
  wx.loadFontFace({ family: 'CurioCubPinyinHand', source, global: false,
    desc: { style: 'normal', weight: '400' },
    success() { page.pinyinFontLoading = false; page.pinyinFontLoaded = true },
    fail(error) { page.pinyinFontLoading = false; console.warn('拼音书写字体加载失败，重进页面后重试', error) }
  })
}

module.exports = { loadPinyinFont }
