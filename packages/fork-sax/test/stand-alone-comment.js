// https://github.com/isaacs/sax-js/issues/124
require(__dirname).test({
  xml: '<!-- stand alone comment -->',
  expect: [
    [
      'comment',
      ' stand alone comment '
    ]
  ],
  strict: true,
  opt: {}
})
