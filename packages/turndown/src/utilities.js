const css = require('css');

export function extend (destination) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i]
    for (var key in source) {
      if (source.hasOwnProperty(key)) destination[key] = source[key]
    }
  }
  return destination
}

export function repeat (character, count) {
  return Array(count + 1).join(character)
}

export var blockElements = [
  'address', 'article', 'aside', 'audio', 'blockquote', 'body', 'canvas',
  'center', 'dd', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'html', 'isindex', 'li', 'main', 'menu', 'nav',
  'noframes', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]

export function isBlock (node) {
  return blockElements.indexOf(node.nodeName.toLowerCase()) !== -1
}

export var voidElements = [
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]

export function isVoid (node) {
  return voidElements.indexOf(node.nodeName.toLowerCase()) !== -1
}

var voidSelector = voidElements.join()
export function hasVoid (node) {
  return node.querySelector && node.querySelector(voidSelector)
}

// To handle code that is presented as below (see https://github.com/laurent22/joplin/issues/573)
//
// <td class="code">
//   <pre class="python">
//     <span style="color: #ff7700;font-weight:bold;">def</span> ma_fonction
//   </pre>
// </td>
export function isCodeBlockSpecialCase1(node) {
  const parent = node.parentNode
  if (!parent) return false;
  return parent.classList && parent.classList.contains('code') && parent.nodeName === 'TD' && node.nodeName === 'PRE'
}

// To handle PRE tags that have a monospace font family. In that case
// we assume it is a code block.
export function isCodeBlockSpecialCase2(node) {
  if (node.nodeName !== 'PRE') return false;

  const style = node.getAttribute('style');
  if (!style) return false;
  const o = css.parse('pre {' + style + '}');
  if (!o.stylesheet.rules.length) return;
  const fontFamily = o.stylesheet.rules[0].declarations.find(d => d.property.toLowerCase() === 'font-family');
  if (!fontFamily || !fontFamily.value) return false;
  const isMonospace = fontFamily.value.split(',').map(e => e.trim().toLowerCase()).indexOf('monospace') >= 0;
  return isMonospace;
}

export function isCodeBlock(node) {
  if (isCodeBlockSpecialCase1(node) || isCodeBlockSpecialCase2(node)) return true

  return (
    node.nodeName === 'PRE' &&
    node.firstChild &&
    node.firstChild.nodeName === 'CODE'
  )
}

export function getStyleProp(node, name) {
  const style = node.getAttribute('style');
  if (!style) return null;

  name = name.toLowerCase();
  if (!style.toLowerCase().includes(name)) return null;

  const o = css.parse('div {' + style + '}');
  if (!o.stylesheet.rules.length) return null;
  const prop = o.stylesheet.rules[0].declarations.find(d => d.property.toLowerCase() === name);
  return prop ? prop.value : null;
}
