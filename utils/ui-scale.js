// Keep normal controls close to their phone size; tracing has its own large canvas.
function getUiScale(windowWidth) {
  return Math.min(windowWidth / 750, 0.65)
}

module.exports = { getUiScale }
