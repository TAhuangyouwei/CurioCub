const {
  initials,
  standardFinals,
  medials,
  threeEndings,
  wholeSyllables,
  tones,
  composeThreeFinal,
  getAvailableTones,
  getAvailableThreeEndings,
  getExample,
  findFirstAvailableTone,
  formatPinyin
} = require('../../data/pinyin-builder')
const { getPinyinPackage } = require('../../data/pinyin-local-audio')
const {
  speakLocalPinyin,
  speakBasicPinyin,
  speakTonedBasicPinyin,
  speakPinyinSequence
} = require('../../utils/pinyin-local-audio')
const { stopAudio } = require('../../utils/audio')

const modes = [
  { value: 'two', label: '自由两拼' },
  { value: 'three', label: '自由三拼' },
  { value: 'whole', label: '整体认读' }
]

function buildResult(initial, final, preferredTone) {
  const availableTones = getAvailableTones(initial, final)
  const selectedTone = availableTones.some((tone) => tone.value === preferredTone && tone.available)
    ? preferredTone
    : findFirstAvailableTone(initial, final)
  const example = getExample(initial, final, selectedTone)
  return {
    tones: availableTones,
    selectedTone,
    example,
    pinyin: example ? formatPinyin(example.base, example.tone) : ''
  }
}

function createPinyinBuilderPage() {
  return {
    data: {
      modes,
      activeMode: 'two',
      initials,
      finals: standardFinals,
      medials,
      threeEndings,
      wholeSyllables,
      tones,
      selectedInitial: 'h',
      selectedFinal: 'ao',
      selectedMedial: 'u',
      selectedEnding: 'a',
      selectedTone: 3,
      selectedWhole: wholeSyllables[0],
      threeFinal: '',
      pinyin: '',
      example: null
    },

    onLoad(options = {}) {
      const routeMatch = String(this.route || '').match(/^packages\/(pinyin-\d+)/)
      this.currentPackage = routeMatch ? routeMatch[1] : 'pinyin-04'

      const activeMode = ['two', 'three', 'whole'].includes(options.mode) ? options.mode : 'two'
      const selectedInitial = options.initial || 'h'
      const selectedFinal = options.final || 'ao'
      const selectedMedial = options.medial || 'u'
      const selectedEnding = options.ending || 'a'
      const selectedTone = Number(options.tone || 3)
      const selectedWhole = wholeSyllables.find((item) => item.value === options.whole) || wholeSyllables[0]
      this.setData({ activeMode, selectedWhole })

      const afterReady = () => {
        if (!options.autoPlay) return
        if (options.sequence === '1') this.playCurrentSequence(options.autoPlay)
        else speakLocalPinyin(options.autoPlay)
      }
      if (activeMode === 'three') {
        this.updateThree(selectedInitial, selectedMedial, selectedEnding, selectedTone, afterReady)
      } else {
        this.updateTwo(selectedInitial, selectedFinal, selectedTone, afterReady)
      }
    },

    switchMode(event) {
      const mode = event.currentTarget.dataset.value
      this.setData({ activeMode: mode })
      if (mode === 'two') {
        this.updateTwo(this.data.selectedInitial, this.data.selectedFinal, this.data.selectedTone)
      } else if (mode === 'three') {
        this.updateThree(this.data.selectedInitial, this.data.selectedMedial, this.data.selectedEnding, this.data.selectedTone)
      }
    },

    updateTwo(initial, final, tone, callback) {
      this.setData({
        selectedInitial: initial,
        selectedFinal: final,
        ...buildResult(initial, final, tone)
      }, callback)
    },

    updateThree(initial, medial, ending, tone, callback) {
      const final = composeThreeFinal(medial, ending)
      this.setData({
        selectedInitial: initial,
        selectedMedial: medial,
        selectedEnding: ending,
        threeFinal: final,
        threeEndings: getAvailableThreeEndings(initial, medial),
        ...buildResult(initial, final, tone)
      }, callback)
    },

    selectInitial(event) {
      const initial = event.currentTarget.dataset.value
      speakBasicPinyin('initial', initial)
      if (this.data.activeMode === 'three') {
        this.updateThree(initial, this.data.selectedMedial, this.data.selectedEnding, this.data.selectedTone)
        return
      }
      this.updateTwo(initial, this.data.selectedFinal, this.data.selectedTone)
    },

    selectFinal(event) {
      const final = event.currentTarget.dataset.value
      this.updateTwo(this.data.selectedInitial, final, this.data.selectedTone, () => {
        speakTonedBasicPinyin('final', final, this.data.selectedTone)
      })
    },

    selectMedial(event) {
      const medial = event.currentTarget.dataset.value
      speakBasicPinyin('final', medial)
      this.updateThree(this.data.selectedInitial, medial, this.data.selectedEnding, this.data.selectedTone)
    },

    selectEnding(event) {
      const ending = event.currentTarget.dataset.value
      this.updateThree(this.data.selectedInitial, this.data.selectedMedial, ending, this.data.selectedTone, () => {
        speakTonedBasicPinyin('final', ending, this.data.selectedTone)
      })
    },

    selectTone(event) {
      const { value, available } = event.currentTarget.dataset
      if (!available) {
        wx.showToast({ title: '这个组合没有该声调，换一个试试', icon: 'none' })
        return
      }
      const selectedTone = Number(value)
      const final = this.data.activeMode === 'three' ? this.data.threeFinal : this.data.selectedFinal
      const example = getExample(this.data.selectedInitial, final, selectedTone)
      this.setData({
        selectedTone,
        example,
        pinyin: example ? formatPinyin(example.base, example.tone) : ''
      }, () => this.readAloud())
    },

    selectWhole(event) {
      const selectedWhole = wholeSyllables.find((item) => item.value === event.currentTarget.dataset.value)
      if (!selectedWhole) return
      this.setData({ selectedWhole }, () => this.playSyllable(selectedWhole.audioKey))
    },

    buildPackageUrl(packageName, autoPlay, sequence) {
      const params = {
        mode: this.data.activeMode,
        initial: this.data.selectedInitial,
        final: this.data.selectedFinal,
        medial: this.data.selectedMedial,
        ending: this.data.selectedEnding,
        tone: this.data.selectedTone,
        whole: this.data.selectedWhole.value,
        autoPlay,
        sequence: sequence ? 1 : 0
      }
      const query = Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join('&')
      return `/packages/${packageName}/pages/builder/index?${query}`
    },

    playCurrentSequence(key) {
      const parts = this.data.activeMode === 'three'
        ? [
            { type: 'initial', value: this.data.selectedInitial },
            { type: 'final', value: this.data.selectedMedial },
            { type: 'final', value: this.data.selectedEnding, toned: true }
          ]
        : [
            { type: 'initial', value: this.data.selectedInitial },
            { type: 'final', value: this.data.selectedFinal, toned: true }
          ]
      speakPinyinSequence(parts, key, this.data.selectedTone)
    },

    playSyllable(key, sequence = false) {
      const packageName = getPinyinPackage(key)
      if (!packageName) {
        wx.showToast({ title: '这个读音正在准备中', icon: 'none' })
        return
      }
      if (packageName !== this.currentPackage) {
        stopAudio()
        wx.redirectTo({ url: this.buildPackageUrl(packageName, key, sequence) })
        return
      }
      if (sequence) this.playCurrentSequence(key)
      else speakLocalPinyin(key)
    },

    readAloud() {
      const { example } = this.data
      if (!example) {
        wx.showToast({ title: '这个组合不能拼读，换一个试试', icon: 'none' })
        return
      }
      this.playSyllable(example.key, true)
    },

    onUnload() {
      stopAudio()
    }
  }
}

module.exports = { createPinyinBuilderPage }
