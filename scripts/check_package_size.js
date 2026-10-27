const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const packages = require('../app.json').subpackages
const ignored = require('../project.config.json').packOptions.ignore
const sizes = { main: 0 }
function count(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.name.startsWith('.') || ignored.some((item) => name === item.value)) continue
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) count(file, name)
    else {
      const owner = packages.find((item) => name.startsWith(`${item.root}/`))
      const key = owner ? owner.name : 'main'
      sizes[key] = (sizes[key] || 0) + fs.statSync(file).size
    }
  }
}
count(root)
const total = Object.values(sizes).reduce((sum, size) => sum + size, 0)
console.log(`上传包保守计量：${(total / 1024 / 1024).toFixed(2)} MiB（${total} 字节）；最大单包 ${(Math.max(...Object.values(sizes)) / 1024 / 1024).toFixed(2)} MiB。`)
for (const [name, size] of Object.entries(sizes)) assert(size <= 2 * 1024 * 1024, `${name} 超出 2 MiB`)
assert(total <= 19 * 1024 * 1024, '上传总包应控制在 19 MiB 内，为当前 20 MB 限制留出编译余量')
