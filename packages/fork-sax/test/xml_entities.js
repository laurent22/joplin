require(__dirname).test({
  opt: { strictEntities: true },
  xml: '<r>&rfloor; ' +
    '&spades; &copy; &rarr; &amp; ' +
    '&lt; < <  <   < &gt; &real; &weierp; &euro;</r>',
  expect: [
    ['opentagstart', {'name': 'R', attributes: {}}],
    ['opentag', {'name': 'R', attributes: {}, isSelfClosing: false}],
    ['text', '&rfloor; &spades; &copy; &rarr; & < < <  <   < > &real; &weierp; &euro;'],
    ['closetag', 'R']
  ]
})
