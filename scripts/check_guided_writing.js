const assert = require('assert')
const { getModule } = require('../data/learning')
const { guideFor, pointAlong, matchesStroke } = require('../packages/hanzi-writing/utils/stroke-guide')

let count = 0
for (const unit of getModule('hanzi').items) {
  const guide = guideFor(unit.title)
  assert(guide && guide.strokes.length === guide.count, `${unit.title} 必须包含全部笔画`)
  for (const stroke of guide.strokes) {
    const points = stroke.points.map(([x, y]) => ({ x: x / 1000, y: y / 1000 }))
    assert(matchesStroke(points, stroke.points), `${unit.title} 标准笔画必须通过`)
    assert(matchesStroke(points.map(({ x, y }) => ({ x: x + 0.012, y: y - 0.012 })), stroke.points), `${unit.title} 允许手指小幅偏移`)
    assert(!matchesStroke([...points].reverse(), stroke.points), `${unit.title} 倒写不能通过`)
    assert(!matchesStroke([points[0]], stroke.points), `${unit.title} 点击不能代替一笔`)
    assert(stroke.commands.length > 0)
    assert.deepStrictEqual(pointAlong(stroke.points, 0), stroke.points[0])
    assert.deepStrictEqual(pointAlong(stroke.points, 1), stroke.points.at(-1))
    count++
  }
}
const folded = guideFor('口').strokes[1].points
assert(!matchesStroke([folded[0], folded.at(-1)].map(([x, y]) => ({ x: x / 1000, y: y / 1000 })), folded), '横折不能直接斜着连到终点')
const horizontal = guideFor('一').strokes[0].points
const toInk = points => points.map(([x, y]) => ({ x: x / 1000, y: y / 1000 }))
assert(matchesStroke(toInk(horizontal).map(p => ({ x: p.x, y: p.y + 0.075 })), horizontal), '一允许手指描写时略微偏下')
const shorterHorizontal = [{ x: 0.21, y: 0.52 }, { x: 0.5, y: 0.51 }, { x: 0.8, y: 0.5 }]
assert(matchesStroke(shorterHorizontal, horizontal), '一的起笔稍晚、收笔稍早也应通过')
const shakyHorizontal = Array.from({ length: 33 }, (_, i) => {
  const [x, y] = pointAlong(horizontal, i / 32)
  return { x: x / 1000, y: y / 1000 + 0.04 + Math.sin(i * Math.PI / 4) * 0.045 }
})
assert(matchesStroke(shakyHorizontal, horizontal), '一允许轻微抖动和局部偏移')
assert(!matchesStroke([...shorterHorizontal].reverse(), horizontal), '放宽后倒写的一仍不能通过')
assert(!matchesStroke([{ x: 0.12, y: 0.51 }, { x: 0.26, y: 0.51 }], horizontal), '只画一小截不能代替完整横画')
const scribble = Array.from({ length: 80 }, (_, i) => ({ x: 0.1 + (i % 2) * 0.8, y: 0.5 }))
assert(!matchesStroke(scribble, horizontal), '反复乱涂不能通过')
assert(!matchesStroke([{ x: 0.05, y: 0.05 }, { x: 0.9, y: 0.9 }], horizontal), '偏离字形的轨迹不能通过')
assert.strictEqual(guideFor('unknown'), null)
assert(guideFor('虫').strokes[0].angle > 45 && guideFor('虫').strokes[0].angle < 90, '虫应先向下')
assert(guideFor('手').strokes[0].angle > 90 && guideFor('手').strokes[0].angle < 180, '撇不能沿笔锋朝左上')
assert(Math.abs(guideFor('上').strokes[0].angle - 90) < 15)
assert(Math.abs(guideFor('刀').strokes[0].angle) < 30, '折笔箭头应显示初始长方向')
console.log(`逐笔判断检查通过：${getModule('hanzi').items.length} 字、${count} 笔标准路径/宽容偏移/倒写/点按，以及一的短横、抖动、折笔和乱涂。`)
