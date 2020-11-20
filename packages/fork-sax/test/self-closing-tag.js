require(__dirname).test({
  xml: '<root>   ' +
    '<haha /> ' +
    '<haha/>  ' +
    '<monkey> ' +
    '=(|)     ' +
    '</monkey>' +
    '</root>  ',
  expect: [
    ['opentagstart', {name: 'ROOT', attributes: {}}],
    ['opentag', {name: 'ROOT', attributes: {}, isSelfClosing: false}],
    ['opentagstart', {name: 'HAHA', attributes: {}}],
    ['opentag', {name: 'HAHA', attributes: {}, isSelfClosing: true}],
    ['closetag', 'HAHA'],
    ['opentagstart', {name: 'HAHA', attributes: {}}],
    ['opentag', {name: 'HAHA', attributes: {}, isSelfClosing: true}],
    ['closetag', 'HAHA'],
    // ["opentag", {name:"HAHA", attributes:{}}],
    // ["closetag", "HAHA"],
    ['opentagstart', {name: 'MONKEY', attributes: {}}],
    ['opentag', {name: 'MONKEY', attributes: {}, isSelfClosing: false}],
    ['text', '=(|)'],
    ['closetag', 'MONKEY'],
    ['closetag', 'ROOT']
  ],
  opt: { trim: true }
})
