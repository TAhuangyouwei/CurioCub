function createQuestion(limit, missing) {
  const whole = Math.floor(Math.random() * (limit - 1)) + 2
  const left = Math.floor(Math.random() * (whole - 1)) + 1
  return { whole, left, right: whole - left, missing }
}

module.exports = { createQuestion }
