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
      'name': 'ROOT',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'ROOT',
      'attributes': {},
      'isSelfClosing': false
    }],
    ['opentagstart', {
      'name': 'CHILD',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'CHILD',
      'attributes': {},
      'isSelfClosing': false
    }],
    ['opentagstart', {
      'name': 'HAHA',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'HAHA',
      'attributes': {},
      'isSelfClosing': true
    }],
    ['closetag', 'HAHA'],
    ['closetag', 'CHILD'],
    ['opentagstart', {
      'name': 'MONKEY',
      'attributes': {}
    }],
    ['opentag', {
      'name': 'MONKEY',
      'attributes': {},
      'isSelfClosing': false
    }],
    ['text', '=(|)'],
    ['closetag', 'MONKEY'],
    ['closetag', 'ROOT'],
    ['end'],
    ['ready']
  ],
  strict: false,
  opt: {}
})
