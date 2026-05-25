import requiredModule_parser from '../';
import t from 'tap';
var parser = requiredModule_parser.parser(true)
t.plan(1)
parser.onopentag = function (node) {
  t.same(node, { name: 'x', attributes: {}, isSelfClosing: false })
}
var xml = new Buffer('<x>y</x>')
parser.write(xml).close()
