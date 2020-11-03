var xmlnsAttr = {
  name: 'xmlns',
  value: 'http://foo',
  prefix: 'xmlns',
  local: '',
  uri: 'http://www.w3.org/2000/xmlns/'
}

var attrAttr = {
  name: 'attr',
  value: 'bar',
  prefix: '',
  local: 'attr',
  uri: ''
}

require(__dirname).test({
  xml: "<elm xmlns='http://foo' attr='bar'/>",
  expect: [
    [
      'opentagstart',
      {
        name: 'elm',
        attributes: {},
        ns: {}
      }
    ],
    [
      'opennamespace',
      { prefix: '', uri: 'http://foo' }
    ],
    [
      'attribute',
      xmlnsAttr
    ],
    [
      'attribute',
      attrAttr
    ],
    [
      'opentag',
      {
        name: 'elm',
        prefix: '',
        local: 'elm',
        uri: 'http://foo',
        ns: { '': 'http://foo' },
        attributes: {
          xmlns: xmlnsAttr,
          attr: attrAttr
        },
        isSelfClosing: true
      }
    ],
    [
      'closetag',
      'elm'
    ],
    [
      'closenamespace',
      {
        prefix: '',
        uri: 'http://foo'
      }
    ]
  ],
  strict: true,
  opt: {
    xmlns: true
  }
})
