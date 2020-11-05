require(__dirname).test({
  xml: "<html><head><script>if (1 < 0) { console.log('elo there'); }</script></head></html>",
  expect: [
    [
      'opentagstart',
      {
        'name': 'HTML',
        'attributes': {}
      }
    ],
    [
      'opentag',
      {
        'name': 'HTML',
        'attributes': {},
        'isSelfClosing': false
      }
    ],
    [
      'opentagstart',
      {
        'name': 'HEAD',
        'attributes': {}
      }
    ],
    [
      'opentag',
      {
        'name': 'HEAD',
        'attributes': {},
        'isSelfClosing': false
      }
    ],
    [
      'opentagstart',
      {
        'name': 'SCRIPT',
        'attributes': {}
      }
    ],
    [
      'opentag',
      {
        'name': 'SCRIPT',
        'attributes': {},
        'isSelfClosing': false
      }
    ],
    [
      'script',
      "if (1 < 0) { console.log('elo there'); }"
    ],
    [
      'closetag',
      'SCRIPT'
    ],
    [
      'closetag',
      'HEAD'
    ],
    [
      'closetag',
      'HTML'
    ]
  ]
})
