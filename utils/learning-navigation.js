function getLearningPage(page, unit) {
  return unit && unit.packageName
    ? `/packages/${unit.packageName}/pages/${page}/index`
    : `/pages/${page}/${page}`
}

module.exports = { getLearningPage }
