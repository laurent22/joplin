// BOM at the very begining of the stream should be ignored
require(__dirname).test({
  xml: '\uFEFF<P></P>',
  expect: [
    ['opentagstart', {'name': 'P', attributes: {}}],
    ['opentag', {'name': 'P', attributes: {}, isSelfClosing: false}],
    ['closetag', 'P']
  ]
})

// In all other places it should be consumed
require(__dirname).test({
  xml: '\uFEFF<P BOM="\uFEFF">\uFEFFStarts and ends with BOM\uFEFF</P>',
  expect: [
    ['opentagstart', {'name': 'P', attributes: {}}],
    ['attribute', {'name': 'BOM', 'value': '\uFEFF'}],
    ['opentag', {'name': 'P', attributes: {'BOM': '\uFEFF'}, isSelfClosing: false}],
    ['text', '\uFEFFStarts and ends with BOM\uFEFF'],
    ['closetag', 'P']
  ]
})

// BOM after a whitespace is an error
require(__dirname).test({
  xml: ' \uFEFF<P></P>',
  expect: [
    ['error', 'Non-whitespace before first tag.\nLine: 0\nColumn: 2\nChar: \uFEFF'],
    ['text', '\uFEFF'],
    ['opentagstart', {'name': 'P', attributes: {}}],
    ['opentag', {'name': 'P', attributes: {}, isSelfClosing: false}],
    ['closetag', 'P']
  ],
  strict: true
})

// There is only one BOM allowed at the start
require(__dirname).test({
  xml: '\uFEFF\uFEFF<P></P>',
  expect: [
    ['error', 'Non-whitespace before first tag.\nLine: 0\nColumn: 2\nChar: \uFEFF'],
    ['text', '\uFEFF'],
    ['opentagstart', {'name': 'P', attributes: {}}],
    ['opentag', {'name': 'P', attributes: {}, isSelfClosing: false}],
    ['closetag', 'P']
  ],
  strict: true
})
