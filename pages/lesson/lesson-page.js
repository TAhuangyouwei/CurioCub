const { getModule, getLearningGroups } = require('../../data/learning')
const { getProgress, completeUnit, markUnitUnlearned, markUnitUnstudied } = require('../../utils/progress')
const { playAudio, stopAudio, preloadAudioPath, clearPreloadedAudio } = require('../../utils/audio')
const { getLearningPage } = require('../../utils/learning-navigation')
const { loadPinyinFont } = require('../../utils/pinyin-font')
const { getHanziSettings, studyUnits, setAutoRead } = require('../../utils/hanzi-settings')
const { createHanziAudio } = require('../../utils/hanzi-audio')

const { prepareUnit, prepareAhead, getPreparedUnit } = require('../../utils/lesson-resources')

function createLessonPage() {
  return {
  data: {
    fontReady: false,
    fontError: false,
    module: null,
    unit: null,
    lessonItems: [],
    swiperIndex: 0,
    swiperCircular: false,
    swiperDuration: 260,
    currentIndex: 0,
    currentNumber: 1,
    cardTotal: 0,
    isHanzi: false,
    isPinyin: false,
    isLiteracy: false,
    isNotebook: false,
    rangeEnabled: false,
    autoRead: true,
    hintVisible: false,
    completed: false,
    unlearned: false
  },

  onLoad(options) {
    this.moduleId = options.moduleId
    const module = getModule(this.moduleId)
    const unitIndex = module ? module.items.findIndex((item) => item.id === options.unitId) : -1
    if (!module || unitIndex === -1) {
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }

    const isLiteracy = module.id === 'hanzi' || module.id === 'pinyin'
    const groupStart = isLiteracy ? 0 : Math.floor(unitIndex / module.groupSize) * module.groupSize
    const settings = getHanziSettings()
    const isNotebook = isLiteracy && options.source === 'notebook'
    if (isNotebook) settings.rangeEnabled = false
    const rangeEnabled = module.id === 'hanzi' && settings.rangeEnabled
    const progress = getProgress()
    this.lessonItems = module.id === 'hanzi'
      ? studyUnits(isNotebook ? module.items.filter((item) => progress.unlearnedIds[item.id]) : module.items, settings)
      : module.id === 'pinyin' ? module.items.filter(item => !isNotebook || progress.unlearnedIds[item.id]) : module.items.slice(groupStart, groupStart + module.groupSize)
    let currentIndex = this.lessonItems.findIndex((item) => item.id === options.unitId)
    if (currentIndex === -1 && rangeEnabled) currentIndex = 0
    if (currentIndex === -1) {
      wx.redirectTo({ url: this.notebookUrl() })
      return
    }
    this.setData({
      module: { id: module.id, title: module.title, icon: module.icon, color: module.color, groupSize: module.groupSize },
      isNotebook,
      rangeEnabled,
      autoRead: settings.autoRead,
      isHanzi: module.id === 'hanzi',
      isPinyin: module.id === 'pinyin', isLiteracy
    })
    if (module.id === 'hanzi') this.hanziAudio = createHanziAudio()
    if (module.id === 'pinyin') loadPinyinFont(this)
    this.setCurrentCard(currentIndex)
  },

  onReady() {
    if (this.data.isHanzi) this.loadFont()
  },

  loadFont() {
    const unit = this.data.unit
    if (!unit) return Promise.resolve()
    const wasReady = Boolean(getPreparedUnit(unit))
    if (this.data.fontError) this.setData({ fontError: false })
    return prepareUnit(unit).then(() => {
      if (this.fontUnloaded || this.data.unit.id !== unit.id) return
      this.refreshPreparedCards()
      this.preloadPhraseAudio()
      if (!wasReady && this.hanziAudio && !this.wasHidden) this.hanziAudio.schedule(this.data.unit)
      // One already-prepared next word plus three new reserve words.
      return prepareAhead(this.lessonItems, this.data.currentIndex, 5, this.data.rangeEnabled || this.data.isNotebook)
        .then(() => { if (!this.fontUnloaded) this.refreshPreparedCards() })
        .catch(error => console.warn('后续字卡预备失败，下次换字时重试', error))
    }).catch(error => {
      if (this.fontUnloaded || this.data.unit.id !== unit.id) return
      console.error('当前字卡准备失败', error)
      this.setData({ fontError: true })
    })
  },

  refreshPreparedCards() {
    const changes = {}
    this.cardIndices.forEach((index, slot) => {
      const ready = getPreparedUnit(this.lessonItems[index])
      if (ready && !this.data.lessonItems[slot].resourceReady) changes[`lessonItems[${slot}]`] = ready
    })
    const current = getPreparedUnit(this.data.unit)
    if (current && (!this.data.fontReady || this.data.unit !== current)) { changes.fontReady = true; changes.unit = current }
    if (Object.keys(changes).length) this.setData(changes)
  },

  preloadPhraseAudio() {
    const unit = this.data.unit
    if (!this.data.isHanzi || this.fontUnloaded || this.wasHidden || !getPreparedUnit(unit)) return
    const file = unit.phraseAudioFile
    preloadAudioPath(file[0] === '/' ? file : `/assets/audio/${file}`)
  },

  onShow() {
    if (this.data.isHanzi) this.setData({ autoRead: getHanziSettings().autoRead })
    const request = getApp().globalData.lessonRequest
    if (request && request.moduleId === this.moduleId) {
      getApp().globalData.lessonRequest = null
      if (request.returnToMap) {
        wx.navigateBack()
        return
      }

      const nextIndex = this.lessonItems.findIndex((item) => item.id === request.unitId)
      if (nextIndex !== -1) {
        this.wasHidden = false
        this.setCurrentCard(nextIndex)
        if (this.data.isHanzi) this.loadFont()
        return
      }
    }

    this.refreshCompletion()
    if (this.wasHidden && this.hanziAudio && getPreparedUnit(this.data.unit)) this.hanziAudio.schedule(this.data.unit)
    this.wasHidden = false
    this.preloadPhraseAudio()
  },

  setCurrentCard(index) {
    const source = this.lessonItems[index]
    const unit = getPreparedUnit(source) || source
    if (!unit) return
    const groupSize = this.data.module.groupSize
    const groupStart = this.data.isHanzi && !this.data.isNotebook && !this.data.rangeEnabled ? Math.floor(index / groupSize) * groupSize : 0
    const progress = getProgress()
    const pinyinGroup = this.data.isPinyin && !this.data.isNotebook ? getLearningGroups(getModule('pinyin')).find(group => group.some(item => item.id === unit.id)) : null
    stopAudio()
    this.setData({
      currentIndex: index,
      currentNumber: pinyinGroup ? pinyinGroup.findIndex(item => item.id === unit.id) + 1 : index - groupStart + 1,
      cardTotal: pinyinGroup ? pinyinGroup.length : this.data.isNotebook || this.data.rangeEnabled ? this.lessonItems.length : Math.min(groupSize, this.lessonItems.length - groupStart),
      unit,
      fontReady: !this.data.isHanzi || Boolean(getPreparedUnit(unit)),
      fontError: false,
      hintVisible: false,
      completed: Boolean(progress.completedIds[unit.id]),
      unlearned: Boolean(progress.unlearnedIds[unit.id])
    })
    if (!this.swiping) this.refreshCardWindow()
    if (this.hanziAudio) {
      this.hanziAudio.stop()
      if (getPreparedUnit(unit)) this.hanziAudio.schedule(unit)
    }
    this.preloadPhraseAudio()
  },

  refreshCardWindow() {
    const index = this.data.currentIndex
    const count = this.lessonItems.length
    const circular = (this.data.rangeEnabled || this.data.isNotebook) && count > 1
    const indices = !this.data.isHanzi || count <= 3 ? this.lessonItems.map((unit, i) => i)
      : [index - 1, index, index + 1]
        .filter(i => circular || (i >= 0 && i < count))
        .map(i => (i + count) % count)
    const swiperIndex = indices.indexOf(index)
    if (this.cardIndices && indices.join() === this.cardIndices.join() && this.data.swiperIndex === swiperIndex) return
    this.cardIndices = indices
    this.setData({
      lessonItems: this.cardIndices.map(i => getPreparedUnit(this.lessonItems[i]) || this.lessonItems[i]),
      swiperIndex,
      swiperCircular: circular && (!this.data.isHanzi || count <= 3),
      swiperDuration: 0
    }, () => this.setData({ swiperDuration: 260 }))
  },

  onSwiperChange(event) {
    // Resetting the small window also emits change events; only gestures change the lesson.
    if (event.detail.source !== 'touch') return
    const index = this.cardIndices[event.detail.current]
    if (index === undefined || index === this.data.currentIndex) return
    this.setData({ swiperIndex: event.detail.current })
    this.swiping = true
    this.onCardChange({ detail: { current: index } })
    this.swiping = false
  },

  onSwiperAnimationFinish(event) {
    if (event && event.detail.source !== 'touch') return
    this.refreshCardWindow()
  },

  refreshCompletion() {
    const unit = this.data.unit
    if (!unit) return
    const progress = getProgress()
    this.setData({
      completed: Boolean(progress.completedIds[unit.id]),
      unlearned: Boolean(progress.unlearnedIds[unit.id])
    })
  },

  onCardChange(event) {
    this.setCurrentCard(event.detail.current)
    if (this.data.isHanzi) return this.loadFont()
  },

  playMainAudio() {
    playAudio(this.data.unit.audioFile)
  },

  playCharacterAudio() {
    return this.playHanziAudio('characterAudioFile')
  },

  playPhraseAudio() {
    return this.playHanziAudio('phraseAudioFile')
  },

  playHanziAudio(field) {
    if (this.hanziAudio) this.hanziAudio.stop()
    const unit = this.data.unit
    const play = () => { if (!this.fontUnloaded && !this.wasHidden && this.data.unit.id === unit.id) playAudio(unit[field]) }
    if (getPreparedUnit(unit)) return play()
    return prepareUnit(unit).then(play).catch(() => {
      if (!this.fontUnloaded && this.data.unit.id === unit.id) this.setData({ fontError: true })
    })
  },

  playCardAudio() {
    const { unit, isHanzi } = this.data
    if (isHanzi) return this.playCharacterAudio()
    if (this.hanziAudio) this.hanziAudio.stop()
    playAudio(unit.audioFile)
  },

  changeAutoRead(event) {
    setAutoRead(event.detail.value)
    this.setData({ autoRead: event.detail.value })
    if (event.detail.value) this.hanziAudio.schedule(this.data.unit)
    else this.hanziAudio.stop()
  },

  showHint(event) {
    if (!this.data.isHanzi || event.currentTarget.dataset.unitId !== this.data.unit.id) return
    this.setData({ hintVisible: true })
  },

  startChallenge() {
    const { module, unit } = this.data
    stopAudio()
    wx.navigateTo({ url: `${getLearningPage('challenge', unit)}?moduleId=${module.id}&unitId=${unit.id}` })
  },

  openTrace() {
    if (!this.data.isHanzi && !this.data.isPinyin) return
    stopAudio()
    if (this.hanziAudio) this.hanziAudio.stop()
    const route = this.data.isPinyin ? '/packages/pinyin-basic-v2/pages/trace/index' : '/packages/hanzi-practice/pages/trace/index'
    wx.navigateTo({ url: `${route}?unitId=${this.data.unit.id}${this.data.isNotebook ? '&source=notebook' : ''}` })
  },

  markLearned() {
    const { module, unit, completed } = this.data
    if (!this.data.isLiteracy || completed) return
    const previousStickerCount = getProgress().stickerCount
    const progress = completeUnit(unit.id, module.id)
    this.setData({ completed: true, unlearned: false })
    wx.showToast({
      title: progress.stickerCount > previousStickerCount ? '解锁新贴纸啦！' : '学会啦！',
      icon: 'success',
      duration: 1200,
      mask: false
    })
  },

  markUnlearned() {
    const { unit, unlearned } = this.data
    if (!this.data.isLiteracy || unlearned) return
    markUnitUnlearned(unit.id, this.moduleId)
    this.setData({ completed: false, unlearned: true })
  },

  markUnstudied() {
    const { unit, completed, unlearned } = this.data
    if (!this.data.isLiteracy || (!completed && !unlearned)) return
    markUnitUnstudied(unit.id, this.moduleId)
    this.setData({ completed: false, unlearned: false })
  },

  returnToModule() {
    if (this.hanziAudio) this.hanziAudio.stop()
    stopAudio()
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({ url: this.data.isNotebook ? this.notebookUrl() : `/pages/module/module?moduleId=${this.moduleId}` })
      }
    })
  },

  notebookUrl() { return this.moduleId === 'pinyin' ? '/pages/notebook/notebook?moduleId=pinyin' : '/pages/notebook/notebook' },

  onHide() {
    this.wasHidden = true
    if (this.hanziAudio) this.hanziAudio.stop()
    stopAudio()
    clearPreloadedAudio()
  },

  onUnload() {
    this.fontUnloaded = true
    this.onHide()
  }
  }
}

module.exports = { createLessonPage }
