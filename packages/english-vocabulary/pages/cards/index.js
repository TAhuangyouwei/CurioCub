const { groups, words } = require('../../../../data/english-vocabulary')
const { playAudio, stopAudio } = require('../../../../utils/audio')

Page({
  data: { groups, topicIndex: 0, groupTitle: groups[0].title, word: null, position: 1, total: 10, audioFile: '', imageError: false },
  onLoad() { this.showWord(0, 0) },
  showWord(topicIndex, index) {
    stopAudio()
    this.topicWords = words.filter(word => word.topic === groups[topicIndex].id)
    const { id, word, meaning, image, audioFile } = this.topicWords[index]
    this.index = index
    this.setData({ topicIndex, groupTitle: groups[topicIndex].title, word: { id, word, meaning, image },
      position: index + 1, total: this.topicWords.length, audioFile, imageError: false })
  },
  changeTopic(event) { this.showWord(Number(event.detail.value), 0) },
  previous() { if (this.index > 0) this.showWord(this.data.topicIndex, this.index - 1) },
  next() { if (this.index + 1 < this.topicWords.length) this.showWord(this.data.topicIndex, this.index + 1) },
  listen() { if (this.data.audioFile) playAudio(this.data.audioFile) },
  imageFailed() { this.setData({ imageError: true }) },
  onHide() { stopAudio() },
  onUnload() { stopAudio() }
})
