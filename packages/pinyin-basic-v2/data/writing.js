// Original centre-line drawings for pinyin handwriting, not English font outlines.
// Four guide lines are y = 0, 40, 80, 120; ascenders/descenders stop inside the outer lines.
function stroke(name, start, ...segments) {
  const points = [start]
  for (const segment of segments) {
    const [x, y] = points[points.length - 1]
    if (segment.length === 2) points.push(segment)
    else for (let i = 1; i <= 24; i++) {
      const t = i / 24, u = 1 - t
      points.push([u*u*u*x + 3*u*u*t*segment[0] + 3*u*t*t*segment[2] + t*t*t*segment[4],
        u*u*u*y + 3*u*u*t*segment[1] + 3*u*t*t*segment[3] + t*t*t*segment[5]])
    }
  }
  return { name, points }
}
const left = () => stroke('左半圆', [52, 43], [46, 40, 39, 40, 32, 40], [18, 40, 12, 49, 12, 60], [12, 72, 19, 80, 32, 80], [40, 80, 47, 78, 52, 75])
const vertical = (x = 52, top = 40, bottom = 80) => stroke('竖', [x, top], [x, bottom])
const dot = x => stroke('点', [x, 18], [x, 20])
const uBend = () => stroke('竖右弯', [14, 40], [14, 62], [14, 74, 20, 80, 32, 80], [44, 80, 52, 70, 52, 60])
const rightArch = (x, end = x + 30) => stroke('右弯竖', [x, 60], [x, 49, x + 8, 40, (x + end) / 2, 40], [end - 6, 40, end, 46, end, 58], [end, 80])
const rightBowl = () => stroke('右半圆', [14, 46], [20, 42, 26, 40, 34, 40], [48, 40, 56, 48, 56, 60], [56, 72, 48, 80, 34, 80], [26, 80, 20, 78, 14, 74])
const letters = {
  a: [left(), vertical()],
  o: [stroke('左上起笔，向左画圆', [48, 43], [43, 40, 37, 40, 32, 40], [18, 40, 10, 48, 10, 60], [10, 72, 18, 80, 32, 80], [46, 80, 54, 72, 54, 60], [54, 52, 53, 47, 48, 43])],
  e: [stroke('横折左半圆', [12, 60], [54, 60], [54, 48, 46, 40, 34, 40], [20, 40, 12, 48, 12, 60], [12, 72, 20, 80, 34, 80], [43, 80, 50, 77, 54, 73])],
  i: [vertical(31), dot(31)],
  u: [uBend(), vertical()],
  ü: [uBend(), vertical(), dot(22), dot(45)],
  b: [vertical(14, 8), rightBowl()],
  p: [vertical(14, 40, 113), rightBowl()],
  m: [vertical(9), rightArch(9, 33), rightArch(33, 57)],
  f: [stroke('右弯竖', [52, 12], [38, 0, 23, 10, 23, 28], [23, 80]), stroke('横', [9, 40], [49, 40])],
  d: [left(), vertical(52, 8)],
  t: [stroke('竖右弯', [27, 14], [27, 68], [27, 80, 44, 80, 53, 75]), stroke('横', [10, 40], [52, 40])],
  n: [vertical(14), rightArch(14, 54)],
  l: [vertical(32, 8)],
  g: [left(), stroke('竖左弯', [52, 40], [52, 96], [52, 118, 25, 119, 14, 105])],
  k: [vertical(14, 8), stroke('左斜', [55, 40], [15, 62]), stroke('右斜', [31, 53], [57, 80])],
  h: [vertical(14, 8), rightArch(14, 54)],
  j: [stroke('竖左弯', [39, 40], [39, 98], [39, 118, 19, 118, 10, 107]), dot(39)],
  q: [left(), vertical(52, 40, 113)],
  x: [stroke('右斜', [12, 40], [56, 80]), stroke('左斜', [56, 40], [12, 80])],
  r: [vertical(18), stroke('右弯', [18, 54], [24, 40, 43, 40, 54, 44])],
  z: [stroke('横折横', [12, 40], [56, 40], [12, 80], [56, 80])],
  c: [stroke('左半圆', [54, 44], [48, 41, 40, 40, 34, 40], [20, 40, 12, 48, 12, 60], [12, 72, 20, 80, 34, 80], [43, 80, 50, 78, 54, 74])],
  s: [stroke('先向左弯，再向右弯', [53, 44], [46, 40, 38, 40, 30, 40], [10, 40, 9, 57, 32, 60], [57, 63, 58, 80, 32, 80], [23, 80, 16, 78, 11, 74])],
  y: [stroke('右斜', [10, 40], [34, 76]), stroke('左斜', [57, 40], [14, 113])],
  w: [stroke('斜下斜上', [6, 40], [19, 80], [33, 40]), stroke('斜下斜上', [33, 40], [46, 80], [60, 40])]
}

function guideFor(title) {
  const characters = [...title]
  const strokes = []
  characters.forEach((letter, index) => {
    if (!letters[letter]) throw new Error(`Missing pinyin writing guide: ${letter}`)
    letters[letter].forEach(part => strokes.push({ letter, letterIndex: index, name: part.name,
      points: part.points.map(([x, y]) => [x + index * 76, y]) }))
  })
  return { width: characters.length * 76 - 10, height: 120, strokes,
    position: characters.map(letter => {
      const points = letters[letter].flatMap(part => part.points)
      const upper = points.some(point => point[1] < 40)
      const lower = points.some(point => point[1] > 80)
      return `${letter === 'a' ? 'ɑ' : letter === 'g' ? 'ɡ' : letter}：${upper && lower ? '上中下格' : upper ? '上中格' : lower ? '中下格' : '中格'}`
    }).join('；') }
}

function pointAt(points, fraction) {
  const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let distance = total * Math.max(0, Math.min(1, fraction))
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? Math.min(1, distance / lengths[i]) : 0
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t]
    }
    distance -= lengths[i]
  }
  return points[0]
}

function pathLength(points) {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - points[index][0], point[1] - points[index][1]), 0)
}

function matchesStroke(ink, expected) {
  if (!ink.length || ink.some(point => point.length !== 2 || point.some(value => !Number.isFinite(value)))) return false
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const length = pathLength(expected), drawn = pathLength(ink)
  // Dots are taps, not miniature lines; still require the correct dot's position.
  if (length <= 4) return drawn <= 20 && ink.every(point => distance(point, expected[0]) <= 7)
  if (ink.length < 2 || drawn < length * 0.65 || drawn > Math.max(length * 1.7, length + 18)) return false
  const tolerance = 8
  if (distance(ink[0], expected[0]) > tolerance || distance(ink[ink.length - 1], expected[expected.length - 1]) > tolerance * 1.2) return false
  // Reject even brief excursions that could fall between the ordered samples.
  for (const point of ink) {
    const near = expected.slice(1).some((end, i) => {
      const start = expected[i], dx = end[0] - start[0], dy = end[1] - start[1]
      const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy || 1)))
      return distance(point, [start[0] + dx * t, start[1] + dy * t]) <= tolerance * 1.5
    })
    if (!near) return false
  }
  const actual = Array.from({ length: 33 }, (_, i) => pointAt(ink, i / 32))
  const target = Array.from({ length: 33 }, (_, i) => pointAt(expected, i / 32))
  const direction = (actual[8][0] - actual[0][0]) * (target[8][0] - target[0][0]) +
    (actual[8][1] - actual[0][1]) * (target[8][1] - target[0][1])
  if (direction <= 0) return false
  const errors = actual.map((point, i) => distance(point, target[i]))
  return errors.every(error => error <= tolerance * 1.7) && errors.reduce((sum, error) => sum + error, 0) / errors.length <= tolerance
}

module.exports = { guideFor, pointAt, matchesStroke }
