require(__dirname).test({
  xml: '<xmlns/>',
  expect: [
    [
      'opentagstart',
      {
        name: 'xmlns',
        attributes: {},
        ns: {}
      }
    ],
    [
      'opentag',
      {
        name: 'xmlns',
        uri: '',
        prefix: '',
        local: 'xmlns',
        attributes: {},
        ns: {},
        isSelfClosing: true
      }
    ],
    [
      'closetag',
      'xmlns'
    ]
  ],
  strict: true,
  opt: {
    xmlns: true
  }
})
