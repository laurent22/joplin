var tap = require('tap')
var saxStream = require('../lib/sax').createStream()
tap.doesNotThrow(function () {
  saxStream.end()
})
