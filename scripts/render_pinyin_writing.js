// Render the actual tracing-page drawing routine for visual inspection of all 63 items.
const fs = require('fs')
const path = require('path')
const { createCanvas, GlobalFonts } = require(process.argv[2] || '@napi-rs/canvas')
const fontSource = require('../assets/fonts/pinyin-hand')
GlobalFonts.register(Buffer.from(fontSource.match(/base64,([A-Za-z0-9+/=]+)/)[1], 'base64'), 'CurioCubPinyinHand')
const { getModule } = require('../data/learning')
let definition
global.Page = page => { definition = page }
global.wx = { getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 1 }) }
require('../packages/pinyin-basic-v2/pages/trace/index')
const units = getModule('pinyin').items
const width = 260, height = 210, columns = 7
const sheet = createCanvas(width * columns, height * Math.ceil(units.length / columns))
const context = sheet.getContext('2d')
context.fillStyle = '#eaf5ff'; context.fillRect(0, 0, sheet.width, sheet.height)
units.forEach((unit, index) => {
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(changes) { Object.assign(this.data, changes) } }
  page.onLoad({ unitId: unit.id })
  const canvas = createCanvas(248, 158)
  page.ctx = canvas.getContext('2d'); page.width = 248; page.height = 158
  page.strokeIndex = page.guide.strokes.length - 1
  page.redraw()
  const x = index % columns * width + 6, y = Math.floor(index / columns) * height + 4
  context.fillStyle = '#304c62'; context.font = '30px CurioCubPinyinHand'
  context.fillText(`${unit.displayTitle}  (${page.guide.strokes.length})`, x + 8, y + 27)
  context.drawImage(canvas, x, y + 39)
})
const target = path.resolve(__dirname, 'stage-reading-audio/pinyin-writing-preview.png')
fs.writeFileSync(target, sheet.toBuffer('image/png'))
console.log(target)
const sample = createCanvas(1200, 260)
const preview = sample.getContext('2d')
preview.fillStyle = '#fffefa'; preview.fillRect(0, 0, 1200, 260)
preview.fillStyle = '#304c62'; preview.font = '90px CurioCubPinyinHand'
preview.fillText('ɑ o e i u ü b p m f', 30, 110)
preview.fillText('d t n l ɡ k h j q x', 30, 230)
const sampleTarget = path.resolve(__dirname, 'stage-reading-audio/pinyin-font-preview.png')
fs.writeFileSync(sampleTarget, sample.toBuffer('image/png'))
console.log(sampleTarget)
