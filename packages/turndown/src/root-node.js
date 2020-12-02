import collapseWhitespace from './collapse-whitespace'
import HTMLParser from './html-parser'
import { isBlock, isVoid } from './utilities'

export default function RootNode (input) {
  var root
  if (typeof input === 'string') {
    var doc = htmlParser().parseFromString(
      // DOM parsers arrange elements in the <head> and <body>.
      // Wrapping in a custom element ensures elements are reliably arranged in
      // a single element.
      '<x-turndown id="turndown-root">' + input + '</x-turndown>',
      'text/html'
    )
    root = doc.getElementById('turndown-root')
  } else {
    root = input.cloneNode(true)
  }
  collapseWhitespace({
    element: root,
    isBlock: isBlock,
    isVoid: isVoid
  })

  return root
}

var _htmlParser
function htmlParser () {
  _htmlParser = _htmlParser || new HTMLParser()
  return _htmlParser
}
