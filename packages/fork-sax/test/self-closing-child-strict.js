require(__dirname).test({
  xml: '<root>' +
    '<child>' +
    '<haha />' +
    '</child>' +
    '<monkey>' +
    '=(|)' +
    '</monkey>' +
    '</root>',
  expect: [
    ['opentagstart', {
      'name': 'root',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'root',
      'attributes': {},
      'isSelfClosing': false
    }],
    ['opentagstart', {
      'name': 'child',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'child',
      'attributes': {},
      'isSelfClosing': false
    }],
    ['opentagstart', {
      'name': 'haha',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'haha',
      'attributes': {},
      'isSelfClosing': true
    }],
    ['closetag', 'haha'],
    ['closetag', 'child'],
    ['opentagstart', {
      'name': 'monkey',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'monkey',
      'attributes': {},
      'isSelfClosing': false
    }],
    ['text', '=(|)'],
    ['closetag', 'monkey'],
    ['closetag', 'root'],
    ['end'],
    ['ready']
  ],
  strict: true,
  opt: {}
})
