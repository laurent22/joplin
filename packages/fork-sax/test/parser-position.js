var sax = require('../lib/sax')
var tap = require('tap')

function testPosition (chunks, expectedEvents) {
  var parser = sax.parser()
  expectedEvents.forEach(function (expectation) {
    parser['on' + expectation[0]] = function () {
      for (var prop in expectation[1]) {
        tap.equal(parser[prop], expectation[1][prop])
      }
    }
  })
  chunks.forEach(function (chunk) {
    parser.write(chunk)
  })
}

testPosition(['<div>abcdefgh</div>'], [
  [ 'opentagstart', { position: 5, startTagPosition: 1 } ],
  [ 'opentag', { position: 5, startTagPosition: 1 } ],
  [ 'text', { position: 19, startTagPosition: 14 } ],
  [ 'closetag', { position: 19, startTagPosition: 14 } ]
])

testPosition(['<div>abcde', 'fgh</div>'], [
  ['opentagstart', { position: 5, startTagPosition: 1 }],
  ['opentag', { position: 5, startTagPosition: 1 }],
  ['text', { position: 19, startTagPosition: 14 }],
  ['closetag', { position: 19, startTagPosition: 14 }]
])
