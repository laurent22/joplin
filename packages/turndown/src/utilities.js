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

export function trimLeadingNewlines (string) {
  return string.replace(/^\n*/, '')
}

export function trimTrailingNewlines (string) {
  // avoid match-at-end regexp bottleneck, see #370
  var indexEnd = string.length
  while (indexEnd > 0 && string[indexEnd - 1] === '\n') indexEnd--
  return string.substring(0, indexEnd)
}

export var blockElements = [
  'ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS',
  'CENTER', 'DD', 'DIR', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER',
  'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES',
  'NOSCRIPT', 'OL', 'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD',
  'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
]

export function isBlock (node) {
  return is(node, blockElements)
}

export var voidElements = [
  'AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT',
  'KEYGEN', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'
]

export function isVoid (node) {
  return is(node, voidElements)
}

export function hasVoid (node) {
  return has(node, voidElements)
}

var meaningfulWhenBlankElements = [
  'A', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TH', 'TD', 'IFRAME', 'SCRIPT',
  'AUDIO', 'VIDEO'
]

export function isMeaningfulWhenBlank (node) {
  return is(node, meaningfulWhenBlankElements)
}

export function hasMeaningfulWhenBlank (node) {
  return has(node, meaningfulWhenBlankElements)
}

function is (node, tagNames) {
  return tagNames.indexOf(node.nodeName) >= 0
}

function has (node, tagNames) {
  return (
    node.getElementsByTagName &&
    tagNames.some(function (tagName) {
      return node.getElementsByTagName(tagName).length
    })
  )
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
