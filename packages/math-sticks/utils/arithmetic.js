function generateQuestions(operation, limit) {
  if (!['add', 'subtract'].includes(operation) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError('请选择加法或减法，并输入1～100的整数')
  }
  const pool = []
  for (let left = 0; left <= limit; left++) {
    const maximum = operation === 'add' ? limit - left : left
    for (let right = 0; right <= maximum; right++) {
      pool.push({ left, right, answer: operation === 'add' ? left + right : left - right })
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const index = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[index]] = [pool[index], pool[i]]
  }
  return Array.from({ length: 10 }, (_, index) => ({ ...pool[index % pool.length] }))
}

module.exports = { generateQuestions }
