const records = require('../data/strokes')
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function decode(text) {
  const bytes = []
  let bits = 0
  let value = 0
  for (const char of text) {
    if (char === '=') break
    value = (value << 6) | alphabet.indexOf(char)
    bits += 6
    if (bits >= 8) { bits -= 8; bytes.push((value >> bits) & 255) }
  }
  return bytes
}

function guideFor(char) {
  const record = records[char]
  if (!record) return null
  const strokes = record[0].map((outline, index) => {
    const data = decode(outline)
    const commands = []
    for (let i = 0; i < data.length;) {
      const opcode = data[i++]
      const length = { 251: 2, 252: 2, 253: 4, 254: 6, 255: 0 }[opcode]
      commands.push([opcode, ...data.slice(i, i + length).map(value => value * 4)])
      i += length
    }
    const median = decode(record[1][index])
    const points = []
    for (let i = 0; i < median.length; i += 2) points.push([median[i] * 4, median[i + 1] * 4])
    const start = points[0]
    const segments = points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]])
    const main = segments.filter(p => Math.hypot(...p) >= pathLength(points) * 0.18)
    const first = main[0] || segments[0]
    const folds = main.some(p => (first[0] * p[0] + first[1] * p[1]) / (Math.hypot(...first) * Math.hypot(...p)) < 0.5)
    const end = points[points.length - 1]
    const direction = folds ? first : [end[0] - start[0], end[1] - start[1]]
    return { commands, points, start, angle: Math.atan2(direction[1], direction[0]) * 180 / Math.PI }
  })
  return { strokes, count: strokes.length }
}

function pathLength(points) {
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0)
}

function pointAlong(points, fraction) {
  if (fraction <= 0) return points[0]
  if (fraction >= 1) return points[points.length - 1]
  let distance = pathLength(points) * fraction
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    if (length && distance <= length) return points[i].map((value, axis) => points[i - 1][axis] + (value - points[i - 1][axis]) * distance / length)
    distance -= length
  }
  return points[points.length - 1]
}

function matchesStroke(ink, expected) {
  if (ink.length < 2 || ink.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false
  const actual = ink.map(p => [p.x * 1000, p.y * 1000])
  const length = pathLength(expected)
  const drawnLength = pathLength(actual)
  if (drawnLength < length * 0.6 || drawnLength > Math.max(length * 1.8, length + 70)) return false
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const tolerance = Math.max(45, Math.min(100, length * 0.22))
  if (distance(actual[0], expected[0]) > tolerance || distance(actual[actual.length - 1], expected[expected.length - 1]) > tolerance * 1.2) return false
  // Compare equally spaced samples in writing order, so shortcuts and reversals fail.
  const a = Array.from({ length: 33 }, (_, i) => pointAlong(actual, i / 32))
  const b = Array.from({ length: 33 }, (_, i) => pointAlong(expected, i / 32))
  const dot = (i, j) => (a[j][0] - a[i][0]) * (b[j][0] - b[i][0]) + (a[j][1] - a[i][1]) * (b[j][1] - b[i][1])
  if (dot(0, 8) <= 0 || dot(0, 32) <= 0) return false
  const errors = a.map((p, i) => distance(p, b[i]))
  return errors.every(error => error <= tolerance * 2) &&
    errors.filter(error => error <= tolerance * 1.3).length >= 30 &&
    errors.reduce((sum, error) => sum + error, 0) / errors.length <= tolerance
}

module.exports = { guideFor, pointAlong, matchesStroke }
