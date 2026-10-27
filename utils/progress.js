const STORAGE_KEY = 'curiocub-progress-v1'

function freshState() {
  return {
    completedIds: {},
    unlearnedIds: {},
    rewardedIds: {},
    stars: 0,
    stickerCount: 0,
    lastModuleId: 'hanzi'
  }
}

function getProgress() {
  const saved = wx.getStorageSync(STORAGE_KEY)
  if (!saved || !saved.completedIds) return freshState()
  return {
    ...saved,
    unlearnedIds: saved.unlearnedIds || {},
    rewardedIds: saved.rewardedIds || { ...saved.completedIds }
  }
}

function saveProgress(progress) {
  wx.setStorageSync(STORAGE_KEY, progress)
  return progress
}

function completeUnit(unitId, moduleId) {
  const progress = getProgress()
  progress.lastModuleId = moduleId

  progress.completedIds[unitId] = true
  delete progress.unlearnedIds[unitId]
  if (!progress.rewardedIds[unitId]) {
    progress.rewardedIds[unitId] = true
    progress.stars += 1
    progress.stickerCount = Math.floor(progress.stars / 4)
  }

  return saveProgress(progress)
}

function markUnitUnlearned(unitId, moduleId) {
  const progress = getProgress()
  progress.lastModuleId = moduleId
  delete progress.completedIds[unitId]
  progress.unlearnedIds[unitId] = true
  return saveProgress(progress)
}

function getModuleCompletion(items) {
  const progress = getProgress()
  return items.filter((item) => progress.completedIds[item.id]).length
}

function resetProgress() {
  wx.removeStorageSync(STORAGE_KEY)
}

module.exports = {
  getProgress,
  completeUnit,
  markUnitUnlearned,
  getModuleCompletion,
  resetProgress
}
