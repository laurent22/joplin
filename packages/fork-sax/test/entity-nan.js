require(__dirname).test({
  xml: '<r>&#NaN;</r>',
  expect: [
    ['opentagstart', {'name': 'R', attributes: {}}],
    ['opentag', {'name': 'R', attributes: {}, isSelfClosing: false}],
    ['text', '&#NaN;'],
    ['closetag', 'R']
  ]
})
