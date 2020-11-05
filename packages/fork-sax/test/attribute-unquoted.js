require(__dirname).test({
  expect: [
    [ 'opentagstart', { name: 'ROOT', attributes: {}, ns: {} } ],
    [ 'attribute', {
      name: 'LENGTH',
      value: '12345',
      prefix: '',
      local: 'LENGTH',
      uri: ''
    } ],
    [ 'opentag', {
      name: 'ROOT',
      attributes: {
        LENGTH: {
          name: 'LENGTH',
          value: '12345',
          prefix: '',
          local: 'LENGTH',
          uri: ''
        }
      },
      ns: {},
      prefix: '',
      local: 'ROOT',
      uri: '',
      isSelfClosing: false
    } ],
    [ 'closetag', 'ROOT' ],
    [ 'end' ],
    [ 'ready' ]
  ],
  strict: false,
  opt: {
    xmlns: true
  }
}).write('<root length=12').write('345></root>').close()
