const { getModule } = require('../data/learning')
const { getProgress } = require('./progress')
const { getHanziSettings, studyUnits } = require('./hanzi-settings')
const { prepareAhead, getPreparedUnit } = require('./lesson-resources')

function startHanziLesson(page, unit, source = '', replace = false) {
  if (page.enteringLesson) return page.enteringLesson
  const settings = getHanziSettings()
  if (source === 'notebook') settings.rangeEnabled = false
  const progress = getProgress()
  const candidates = getModule('hanzi').items.filter(item => source !== 'notebook' || progress.unlearnedIds[item.id])
  const units = studyUnits(candidates, settings)
  let index = units.findIndex(item => item.id === unit.id)
  if (index < 0) index = 0
  if (!units.length) return Promise.resolve()
  const first = units[index]
  const circular = settings.rangeEnabled || source === 'notebook'
  const second = units[index + 1] || (circular ? units[0] : first)
  const showLoading = !getPreparedUnit(first) || !getPreparedUnit(second)
  if (showLoading && wx.showLoading) wx.showLoading({ title: '准备学习中', mask: true })
  const request = prepareAhead(units, index, 2, circular).then(() => {
    if (showLoading && wx.hideLoading) wx.hideLoading()
    if (typeof getCurrentPages === 'function' && getCurrentPages().slice(-1)[0] !== page) return
    const url = `/pages/lesson/lesson?moduleId=hanzi&unitId=${units[index].id}${source ? `&source=${source}` : ''}`
    wx[replace ? 'redirectTo' : 'navigateTo']({ url })
  }).catch(error => {
    if (showLoading && wx.hideLoading) wx.hideLoading()
    console.error('学习资源准备失败', error)
    wx.showToast({ title: '准备失败，请再点一次', icon: 'none' })
  }).finally(() => { page.enteringLesson = null })
  page.enteringLesson = request
  return request
}

module.exports = { startHanziLesson }
