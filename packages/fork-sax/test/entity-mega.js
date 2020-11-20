var sax = require('../')
var xml = '<r>'
var text = ''
for (var i in sax.ENTITIES) {
  xml += '&' + i + ';'
  text += sax.ENTITIES[i]
}
xml += '</r>'
require(__dirname).test({
  xml: xml,
  expect: [
    ['opentagstart', {'name': 'R', attributes: {}}],
    ['opentag', {'name': 'R', attributes: {}, isSelfClosing: false}],
    ['text', text],
    ['closetag', 'R']
  ]
})
