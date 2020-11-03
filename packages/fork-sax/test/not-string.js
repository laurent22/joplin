var parser = require('../').parser(true)
var t = require('tap')
t.plan(1)
parser.onopentag = function (node) {
  t.same(node, { name: 'x', attributes: {}, isSelfClosing: false })
}
var xml = new Buffer('<x>y</x>')
parser.write(xml).close()
