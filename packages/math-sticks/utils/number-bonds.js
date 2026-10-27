function createQuestion(limit) {
  const target = Math.floor(Math.random() * limit) + 1
  return { target, initialCount: Math.floor(Math.random() * target) }
}

function createLayout(width, limit) {
  const columns = Math.max(1, Math.min(5, Math.floor((width - 24) / 44)))
  const zoneHeight = Math.ceil(limit / columns) * 48 + 48
  return {
    width, limit, columns, height: zoneHeight * 2 + 16,
    basket: { x: 0, y: 0, width, height: zoneHeight },
    tray: { x: 0, y: zoneHeight + 16, width, height: zoneHeight }
  }
}

function slotPosition(index, zone, layout) {
  const cellWidth = (layout.width - 24) / layout.columns
  return { x: 12 + (index % layout.columns) * cellWidth + (cellWidth - 44) / 2, y: zone.y + 40 + Math.floor(index / layout.columns) * 48 }
}

function arrangeStars(stars, layout, initialCount) {
  const indexes = { basket: initialCount, tray: 0 }
  return stars.map(star => ({ ...star, ...slotPosition(indexes[star.zone]++, layout[star.zone], layout) }))
}

function dropStar(stars, id, position, layout, initialCount) {
  const star = stars.find(item => item.id === id)
  if (!star) return stars
  const x = position.x + 22
  const y = position.y + 22
  const zone = ['basket', 'tray'].find(name => {
    const area = layout[name]
    return x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height
  })
  if (!zone) return stars
  const count = initialCount + stars.filter(item => item.zone === 'basket').length
  if (zone === 'basket' && star.zone !== 'basket' && count >= layout.limit) return stars
  return arrangeStars(stars.map(item => item.id === id ? { ...item, zone } : item), layout, initialCount)
}

module.exports = { createQuestion, createLayout, slotPosition, arrangeStars, dropStar }
