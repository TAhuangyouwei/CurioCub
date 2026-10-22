const LAYOUT = {
  horizontalPaddingRpx: 120,
  chipWidthRpx: 150,
  chipHeightRpx: 92,
  targetWidthRpx: 250,
  targetHeightRpx: 92,
  rowGapRpx: 28
}

function createReviewLayout(units, windowWidth, isHanzi = false) {
  const scale = windowWidth / 750
  const boardWidth = windowWidth - LAYOUT.horizontalPaddingRpx * scale
  const chipWidth = isHanzi ? (boardWidth - 32) / 5 : LAYOUT.chipWidthRpx * scale
  const chipHeight = isHanzi ? 44 : LAYOUT.chipHeightRpx * scale
  const targetWidth = isHanzi ? (boardWidth - 12) / 2 : LAYOUT.targetWidthRpx * scale
  const targetHeight = isHanzi ? 44 : LAYOUT.targetHeightRpx * scale
  const rowGap = isHanzi ? 8 : LAYOUT.rowGapRpx * scale
  const rowStep = targetHeight + rowGap
  const targetX = boardWidth - targetWidth
  const targetTop = isHanzi ? Math.ceil(units.length / 5) * rowStep + 16 : 0
  const targetRows = isHanzi ? Math.ceil(units.length / 2) : units.length
  const boardHeight = targetTop + targetRows * targetHeight + Math.max(0, targetRows - 1) * rowGap
  const targets = units.slice().reverse().map((unit, index) => ({
    id: unit.id,
    title: unit.title,
    pinyin: unit.pinyin,
    phrase: unit.phrase,
    icon: unit.icon,
    x: isHanzi ? (index % 2) * (targetWidth + 12) : targetX,
    y: isHanzi ? targetTop + Math.floor(index / 2) * rowStep : index * rowStep,
    paired: false
  }))
  const targetById = targets.reduce((result, target) => {
    result[target.id] = target
    return result
  }, {})
  const matches = units.map((unit, index) => ({
    id: unit.id,
    title: unit.title,
    startX: isHanzi ? (index % 5) * (chipWidth + 8) : 0,
    startY: isHanzi ? Math.floor(index / 5) * rowStep : index * rowStep,
    x: isHanzi ? (index % 5) * (chipWidth + 8) : 0,
    y: isHanzi ? Math.floor(index / 5) * rowStep : index * rowStep,
    targetX: targetById[unit.id].x,
    targetY: targetById[unit.id].y,
    paired: false
  }))

  return {
    targets,
    matches,
    boardHeight,
    metrics: { chipWidth, chipHeight, targetWidth, targetHeight }
  }
}

function isInsideTarget(position, match, metrics) {
  const centerX = position.x + metrics.chipWidth / 2
  const centerY = position.y + metrics.chipHeight / 2
  return centerX >= match.targetX
    && centerX <= match.targetX + metrics.targetWidth
    && centerY >= match.targetY
    && centerY <= match.targetY + metrics.targetHeight
}

function snappedPosition(match, metrics) {
  return {
    x: match.targetX + (metrics.targetWidth - metrics.chipWidth) / 2,
    y: match.targetY + (metrics.targetHeight - metrics.chipHeight) / 2
  }
}

module.exports = { createReviewLayout, isInsideTarget, snappedPosition }
