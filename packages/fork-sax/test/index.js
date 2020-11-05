var sax = require('../lib/sax')

var t = require('tap')

exports.sax = sax

// handy way to do simple unit tests
// if the options contains an xml string, it'll be written and the parser closed.
// otherwise, it's assumed that the test will write and close.
exports.test = function test (options) {
  var xml = options.xml
  var parser = sax.parser(options.strict, options.opt)
  var expect = options.expect
  var e = 0
  sax.EVENTS.forEach(function (ev) {
    parser['on' + ev] = function (n) {
      if (process.env.DEBUG) {
        console.error({
          expect: expect[e],
          actual: [ev, n]
        })
      }
      if (e >= expect.length && (ev === 'end' || ev === 'ready')) {
        return
      }
      t.ok(e < expect.length, 'no unexpected events')

      if (!expect[e]) {
        t.fail('did not expect this event', {
          event: ev,
          expect: expect,
          data: n
        })
        return
      }

      t.equal(ev, expect[e][0])
      if (ev === 'error') {
        t.equal(n.message, expect[e][1])
      } else {
        t.deepEqual(n, expect[e][1])
      }
      e++
      if (ev === 'error') {
        parser.resume()
      }
    }
  })
  if (xml) {
    parser.write(xml).close()
  }
  return parser
}

if (module === require.main) {
  t.pass('common test file')
}
