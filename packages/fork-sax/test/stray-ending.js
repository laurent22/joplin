// stray ending tags should just be ignored in non-strict mode.
// https://github.com/isaacs/sax-js/issues/32
require(__dirname).test({
  xml: '<a><b></c></b></a>',
  expect: [
    [
      'opentagstart',
      {
        name: 'A',
        attributes: {}
      }
    ],
    [
      'opentag',
      {
        name: 'A',
        attributes: {},
        isSelfClosing: false
      }
    ],
    [
      'opentagstart',
      {
        name: 'B',
        attributes: {}
      }
    ],
    [
      'opentag',
      {
        name: 'B',
        attributes: {},
        isSelfClosing: false
      }
    ],
    [
      'text',
      '</c>'
    ],
    [
      'closetag',
      'B'
    ],
    [
      'closetag',
      'A'
    ]
  ],
  strict: false,
  opt: {}
})
