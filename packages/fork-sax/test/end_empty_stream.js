import lib_sax_createStream from '../lib/sax';
import tap from 'tap';
var saxStream = lib_sax_createStream.createStream()
tap.doesNotThrow(function () {
  saxStream.end()
})
