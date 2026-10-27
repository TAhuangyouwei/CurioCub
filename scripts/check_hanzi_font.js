const assert = require('assert')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { getModule } = require('../data/learning')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const manifest = JSON.parse(read('scripts/font-source/hanzi-kai.json'))
const characters = [...new Set(getModule('hanzi').items.map((unit) => unit.title))].sort().join('')
assert.strictEqual(manifest.characters, characters, '字体必须覆盖当前所有生字，新增生字后应重新生成')
let fontBytes = 0
for (const face of manifest.files) {
  const css = read(face.file)
  const payload = css.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/)
  assert(payload, '字体应随包内置，不能依赖网络下载或设备安装的楷体')
  const font = Buffer.from(payload[1], 'base64')
  fontBytes += font.length
  assert.strictEqual(font.subarray(0, 4).toString(), 'wOF2')
  assert.strictEqual(crypto.createHash('sha256').update(font).digest('hex'), face.sha256)
  assert(!/https?:\/\//.test(css), '运行时字体不能使用远程地址')
  assert.strictEqual([...css.match(/unicode-range:\s*([^;]+)/)[1].matchAll(/U\+([0-9A-F]+)/g)].map((match) => String.fromCodePoint(parseInt(match[1], 16))).join(''), face.characters)
}
for (const unit of getModule('hanzi').items) {
  const file = unit.packageName ? `packages/${unit.packageName}/fonts/hanzi-kai.wxss` : 'assets/fonts/hanzi-kai.wxss'
  assert(manifest.files.find((face) => face.file === file).characters.includes(unit.title), `${unit.title} 的学习页不能缺少楷体`)
  const practice = manifest.files.find((face) => face.file === 'packages/hanzi-practice/fonts/hanzi-kai.wxss')
  assert(!unit.packageName || practice.characters.includes(unit.title), `${unit.title} 的临摹页不能缺少楷体`)
  if (unit.packageName) assert(read(`packages/${unit.packageName}/pages/lesson/index.wxss`).includes('@import "../../fonts/hanzi-kai.wxss";'))
}
for (const page of ['today', 'reading', 'trace']) assert(read(`packages/hanzi-practice/pages/${page}/index.wxss`).startsWith('@import "../../fonts/hanzi-kai.wxss";'))
assert(read('app.wxss').startsWith('@import "./assets/fonts/hanzi-kai.wxss";'))
assert(read('pages/lesson/lesson.wxml').includes("{{isHanzi ? 'hanzi-symbol' : ''}}"), '楷体只应用于汉字学习内容')
assert(/\.hanzi-symbol\s*\{[^}]*font-family:\s*"CurioCubKai"[^}]*font-weight:\s*400/.test(read('pages/lesson/lesson.wxss')), '学习大字应保留楷体原始粗细')
assert(/\.trace-character\s*\{[^}]*font-family:\s*"CurioCubKai"/.test(read('packages/hanzi-practice/pages/trace/index.wxss')), '临摹与学习必须使用同一套字形')
assert(read('assets/fonts/LICENSE.txt').includes('As a special exception'), '应保留字体授权与嵌入例外')

// Conservatively count every main-package file, including unrecognised file types.
const ignored = require('../project.config.json').packOptions.ignore
const subpackages = require('../app.json').subpackages || require('../app.json').subPackages || []
function count(directory, relative = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.name.startsWith('.') || subpackages.some((item) => file === item.root.replace(/\/$/, '')) ||
      ignored.some((item) => item.value === file)) return total
    return total + (entry.isDirectory() ? count(path.join(directory, entry.name), file) : fs.statSync(path.join(directory, entry.name)).size)
  }, 0)
}
const mainBytes = count(root)
assert(mainBytes <= 2 * 1024 * 1024, `主包大小 ${mainBytes} 超出 2 MiB`)
console.log(`楷体检查通过：${characters.length} 个字，分包字形全部覆盖，字体合计 ${fontBytes} 字节，主包保守计量 ${mainBytes} 字节。`)
