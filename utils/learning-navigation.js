function getLearningPage(page, unit) {
  if (page === 'lesson' && unit && unit.id.startsWith('hanzi-')) return '/pages/lesson/lesson'
  if (page === 'review' && unit && unit.id.startsWith('hanzi-')) return '/packages/hanzi-practice/pages/review/index'
  return unit && unit.packageName
    ? `/packages/${unit.packageName}/pages/${page}/index`
    : `/pages/${page}/${page}`
}

module.exports = { getLearningPage }
