const LIMIT = 10

function createLayout(width, mode) {
  const names = mode === 'count'
    ? [['a', '数数区'], ['pool', '收纳盒']]
    : mode === 'add'
      ? [['a', '第一组'], ['b', '第二组'], ['pool', '收纳盒']]
      : [['a', '剩下'], ['b', '拿走']]
  const zones = names.map(([id, title], index) => {
    if (mode === 'add' && id !== 'pool') {
      const half = (width - 12) / 2
      return { id, title, x: index * (half + 12), y: 0, width: half, height: 230, columns: 3 }
    }
    return { id, title, x: 0, y: mode === 'add' ? 242 : index * 146, width, height: 134, columns: 5 }
  })
  const chipWidth = Math.min(44, ...zones.map((zone) => (zone.width - 20) / zone.columns))
  return { width, height: Math.max(...zones.map((zone) => zone.y + zone.height)), chipWidth, chipHeight: 44, zones }
}

function createSticks(mode, total) {
  return Array.from({ length: mode === 'subtract' ? total : LIMIT }, (_, id) => ({
    id, zone: mode === 'subtract' ? 'a' : 'pool'
  }))
}

function arrangeSticks(sticks, layout) {
  const slots = { a: 0, b: 0, pool: 0 }
  return sticks.map((stick) => {
    const zone = layout.zones.find((item) => item.id === stick.zone)
    const slot = slots[stick.zone]++
    const cellWidth = (zone.width - 20) / zone.columns
    return {
      ...stick,
      x: zone.x + 10 + (slot % zone.columns) * cellWidth + (cellWidth - layout.chipWidth) / 2,
      y: zone.y + 34 + Math.floor(slot / zone.columns) * 48
    }
  })
}

// Touch points and stick positions are both CSS pixels. Using the movement
// from the initial touch preserves the finger's grab offset and page scroll.
function dragPosition(start, touch) {
  return {
    x: start.x + touch.pageX - start.pageX,
    y: start.y + touch.pageY - start.pageY
  }
}

function dropStick(sticks, id, position, layout) {
  const centerX = position.x + layout.chipWidth / 2
  const centerY = position.y + layout.chipHeight / 2
  const target = layout.zones.find((zone) =>
    centerX >= zone.x && centerX <= zone.x + zone.width &&
    centerY >= zone.y && centerY <= zone.y + zone.height
  )
  const next = sticks.map((stick) => stick.id === id && target ? { ...stick, zone: target.id } : stick)
  return arrangeSticks(next, layout)
}

function getSummary(sticks, mode) {
  const counts = { a: 0, b: 0, pool: 0 }
  sticks.forEach((stick) => { counts[stick.zone] += 1 })
  if (mode === 'count') return { counts, equation: `${counts.a} 根`, caption: '数数区里有几根？' }
  if (mode === 'add') return { counts, equation: `${counts.a} + ${counts.b} = ${counts.a + counts.b}`, caption: '两组放在一起，一共有几根？' }
  return { counts, equation: `${counts.a + counts.b} − ${counts.b} = ${counts.a}`, caption: '原有 − 拿走 = 剩下' }
}

module.exports = { LIMIT, createLayout, createSticks, arrangeSticks, dragPosition, dropStick, getSummary }
