const guides = require('../data/stroke-guides')
function guideFor(char) {
  const guide = guides[char]
  if (!guide) return null
  const start = guide.points[0]
  const segments = guide.points.slice(1).map((point, index) => ({
    dx: point[0] - guide.points[index][0], dy: point[1] - guide.points[index][1]
  }))
  // Ignore brush-cap turns; a folding stroke still needs its first long direction.
  const total = segments.reduce((sum, segment) => sum + Math.hypot(segment.dx, segment.dy), 0)
  const main = segments.filter((segment) => Math.hypot(segment.dx, segment.dy) >= total * 0.18)
  const first = main[0] || segments[0]
  const folds = main.some((segment) => (first.dx * segment.dx + first.dy * segment.dy) /
    (Math.hypot(first.dx, first.dy) * Math.hypot(segment.dx, segment.dy)) < 0.5)
  const end = guide.points[guide.points.length - 1]
  const direction = folds ? first : { dx: end[0] - start[0], dy: end[1] - start[1] }
  return { ...guide, start, angle: Math.atan2(direction.dy, direction.dx) * 180 / Math.PI }
}
function pointAlong(points, fraction) {
  if (fraction <= 0) return points[0]
  if (fraction >= 1) return points[points.length - 1]
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]))
  let distance = lengths.reduce((sum, value) => sum + value, 0) * fraction
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index] && lengths[index]) {
      const ratio = distance / lengths[index]
      return points[index].map((value, axis) => value + (points[index + 1][axis] - value) * ratio)
    }
    distance -= lengths[index]
  }
  return points[points.length - 1]
}
module.exports = { guideFor, pointAlong }
