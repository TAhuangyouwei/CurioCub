const STORAGE_KEY = 'curiocub-progress-v1'

function freshState() {
  return {
    completedIds: {},
    stars: 0,
    stickerCount: 0,
    lastModuleId: 'hanzi'
  }
}

function getProgress() {
  const saved = wx.getStorageSync(STORAGE_KEY)
  return saved && saved.completedIds ? saved : freshState()
}

function saveProgress(progress) {
  wx.setStorageSync(STORAGE_KEY, progress)
  return progress
}

function completeUnit(unitId, moduleId) {
  const progress = getProgress()
  progress.lastModuleId = moduleId

  if (!progress.completedIds[unitId]) {
    progress.completedIds[unitId] = true
    progress.stars += 1
    progress.stickerCount = Math.floor(progress.stars / 4)
  }

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
  getModuleCompletion,
  resetProgress
}
