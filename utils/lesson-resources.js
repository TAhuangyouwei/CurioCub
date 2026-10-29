const fonts = new Map()
const pending = new Map()
const prepared = new Map()
const fontSources = {
  'hanzi-extra': (success, fail) => require('../packages/hanzi-extra/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-1': (success, fail) => require('../packages/hanzi-reading-1/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-2': (success, fail) => require('../packages/hanzi-reading-2/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-3': (success, fail) => require('../packages/hanzi-reading-3/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-4': (success, fail) => require('../packages/hanzi-reading-4/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-5': (success, fail) => require('../packages/hanzi-reading-5/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-6': (success, fail) => require('../packages/hanzi-reading-6/fonts/hanzi-kai.js', success, fail),
  'hanzi-reading-7': (success, fail) => require('../packages/hanzi-reading-7/fonts/hanzi-kai.js', success, fail)
}

function loadFont(name) {
  const family = `CurioCubKai_${(name || 'main').replace(/-/g, '_')}`
  if (!fonts.has(family)) {
    const promise = Promise.resolve().then(() => name
      ? new Promise(fontSources[name]) : require('../assets/fonts/hanzi-kai.js'))
      .then(source => new Promise((resolve, reject) => wx.loadFontFace({
        family, source, global: true, scopes: ['webview'],
        desc: { style: 'normal', weight: '400' },
        success: () => resolve(family), fail: reject
      })))
    fonts.set(family, promise)
    promise.catch(() => fonts.delete(family))
  }
  return fonts.get(family)
}

function getPreparedUnit(unit) { return unit && prepared.get(unit.id) }

function prepareUnit(unit) {
  if (prepared.has(unit.id)) return Promise.resolve(prepared.get(unit.id))
  if (!pending.has(unit.id)) {
    // Async require downloads the font's package, including its recordings and images.
    // Decode only after that package has finished loading.
    const promise = loadFont(unit.packageName).then(fontFamily => Promise.all([
      fontFamily,
      new Promise((resolve, reject) => wx.getImageInfo({ src: unit.imageFile, success: resolve, fail: reject }))
    ])).then(([fontFamily]) => {
      // Keep the package-root path: getImageInfo may return a page-relative path.
      const ready = { ...unit, fontFamily, resourceReady: true }
      prepared.set(unit.id, ready)
      return ready
    })
    pending.set(unit.id, promise)
    promise.then(() => pending.delete(unit.id), () => pending.delete(unit.id))
  }
  return pending.get(unit.id)
}

function prepareAhead(units, index, count, circular = false) {
  const next = []
  for (let offset = 0; offset < Math.min(count, units.length); offset++) {
    const position = index + offset
    if (!circular && position >= units.length) break
    next.push(prepareUnit(units[position % units.length]))
  }
  return Promise.all(next)
}

module.exports = { prepareUnit, prepareAhead, getPreparedUnit }
