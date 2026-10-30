const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const stageIndex = process.argv.indexOf('--audio-stage')
const audioStage = stageIndex >= 0 ? path.resolve(process.argv[stageIndex + 1]) : ''
const packages = require('../app.json').subpackages
const ignored = require('../project.config.json').packOptions.ignore
const sizes = { main: 0 }
function isIgnored(name) {
  return ignored.some(item => item.type === 'suffix'
    ? name.toLowerCase().endsWith(item.value.toLowerCase()) : name === item.value)
}
assert(isIgnored('packages/hanzi-reading-7/audio/hanzi-469-phrase.compact.mp3'), '临时压缩音频必须排除，避免预览读取已移除的中间文件')
assert(!isIgnored('packages/hanzi-reading-7/audio/hanzi-469-phrase.mp3'), '正式录音必须保留在上传包中')
function count(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.name.startsWith('.') || isIgnored(name)) continue
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) count(file, name)
    else {
      const owner = packages.find((item) => name.startsWith(`${item.root}/`))
      const key = owner ? owner.name : 'main'
      const staged = audioStage && name.endsWith('.mp3') ? path.join(audioStage, name) : ''
      sizes[key] = (sizes[key] || 0) + fs.statSync(staged && fs.existsSync(staged) ? staged : file).size
    }
  }
}
count(root)
const total = Object.values(sizes).reduce((sum, size) => sum + size, 0)
console.log(`上传包保守计量：${(total / 1024 / 1024).toFixed(2)} MiB（${total} 字节）；最大单包 ${(Math.max(...Object.values(sizes)) / 1024 / 1024).toFixed(2)} MiB。`)
for (const [name, size] of Object.entries(sizes)) assert(size <= 2 * 1024 * 1024, `${name} 超出 2 MiB`)
// Keep the existing content budget; include all 150 images and 138 new offline recordings.
const englishVocabularySize = sizes['english-vocabulary'] || 0
assert(total - englishVocabularySize <= 19 * 1024 * 1024, '原有内容仍应控制在 19 MiB 内')
assert(englishVocabularySize <= 1.05 * 1024 * 1024, '英语图片和录音词库应控制在 1.05 MiB 内')
assert(total <= 19.9 * 1024 * 1024, '上传总包应控制在 19.9 MiB 内，为 20 MiB 总包保留编译余量')
