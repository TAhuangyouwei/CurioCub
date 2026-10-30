// Build rounded letter outlines from the exact same paths used for stroke teaching.
const fs = require('fs')
const path = require('path')
const { Path2D, PathOp, StrokeCap, StrokeJoin } = require(process.argv[2] || '@napi-rs/canvas')
const { guideFor } = require('../packages/pinyin-basic-v2/data/writing')
const letters = [...'abcdefghijklmnopqrstuvwxyz'].filter(char => char !== 'v').concat('ü')
const glyphs = letters.map(char => {
  let outline = new Path2D()
  for (const stroke of guideFor(char).strokes) {
    const line = new Path2D()
    stroke.points.forEach(([x, y], index) => index ? line.lineTo(x, y) : line.moveTo(x, y))
    outline = outline.op(line.stroke({ width: 5, cap: StrokeCap.Round, join: StrokeJoin.Round }), PathOp.Union)
  }
  // TrueType uses nonzero winding; preserve the counters formed by joined strokes.
  outline = outline.simplify().asWinding().transform({ a: 10, b: 0, c: 0, d: -10, e: 0, f: 800 })
  return { char, outline: outline.toSVGString() }
})
const output = path.join(__dirname, 'stage-reading-audio/pinyin-font-outlines.json')
fs.writeFileSync(output, JSON.stringify(glyphs))
console.log(output)
