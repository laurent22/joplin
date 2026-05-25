import fs_160 from 'fs';
import util_161 from 'util';
import path_162 from 'path';
import sax_163 from '../lib/sax';
var fs = fs_160,
  util = util_161,
  path = path_162,
  xml = fs.readFileSync(path.join(__dirname, 'test.xml'), 'utf8'),
  sax = sax_163,
  strict = sax.parser(true),
  loose = sax.parser(false, {trim: true}),
  inspector = function (ev) { return function (data) {
      console.error('%s %s %j', this.line + ':' + this.column, ev, data)
    }}

sax.EVENTS.forEach(function (ev) {
  loose['on' + ev] = inspector(ev)
})
loose.onend = function () {
  console.error('end')
  console.error(loose)
}

// do this in random bits at a time to verify that it works.
(function () {
  if (xml) {
    var c = Math.ceil(Math.random() * 1000)
    loose.write(xml.substr(0, c))
    xml = xml.substr(c)
    process.nextTick(arguments.callee)
  } else loose.close()
})()
