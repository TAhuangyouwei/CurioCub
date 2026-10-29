const { createTracePage } = require('../../../../pages/trace/trace-page')

Page(createTracePage((success, fail) => {
  require('../../../hanzi-writing/utils/stroke-guide.js', success, fail)
}))
