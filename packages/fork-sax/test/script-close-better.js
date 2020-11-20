require(__dirname).test({
  xml: "<html><head><script>'<div>foo</div></'</script></head></html>",
  expect: [
    ['opentagstart', {'name': 'HTML', 'attributes': {}}],
    ['opentag', {'name': 'HTML', 'attributes': {}, isSelfClosing: false}],
    ['opentagstart', {'name': 'HEAD', 'attributes': {}}],
    ['opentag', {'name': 'HEAD', 'attributes': {}, isSelfClosing: false}],
    ['opentagstart', {'name': 'SCRIPT', 'attributes': {}}],
    ['opentag', {'name': 'SCRIPT', 'attributes': {}, isSelfClosing: false}],
    ['script', "'<div>foo</div></'"],
    ['closetag', 'SCRIPT'],
    ['closetag', 'HEAD'],
    ['closetag', 'HTML']
  ]
})
