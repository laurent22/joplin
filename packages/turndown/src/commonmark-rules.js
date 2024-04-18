import { repeat, isCodeBlockSpecialCase1, isCodeBlockSpecialCase2, isCodeBlock, getStyleProp } from './utilities'
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;

function attributesHtml(attributes, options = null) {
  if (!attributes) return '';

  options = Object.assign({}, {
    skipEmptyClass: false,
  }, options);

  const output = [];

  for (let attr of attributes) {
    if (attr.name === 'class' && !attr.value && options.skipEmptyClass) continue;
    output.push(`${attr.name}="${htmlentities(attr.value)}"`);
  }

  return output.join(' ');
}

var rules = {}

rules.paragraph = {
  filter: 'p',

  replacement: function (content) {
    // If the line starts with a nonbreaking space, replace it. By default, the
    // markdown renderer removes leading non-HTML-escaped nonbreaking spaces. However,
    // because the space is nonbreaking, we want to keep it.
    // \u00A0 is a nonbreaking space.
    const leadingNonbreakingSpace = /^\u{00A0}/ug;
    content = content.replace(leadingNonbreakingSpace, '&nbsp;');

    // Paragraphs that are truly empty (not even containing nonbreaking spaces)
    // take up by default no space. Output nothing.
    if (content === '') {
      return '';
    }

    return '\n\n' + content + '\n\n'
  }
}

rules.lineBreak = {
  filter: 'br',

  replacement: function (_content, node, options, previousNode) {
    let brReplacement = options.br + '\n';

    // Code blocks may include <br/>s -- replacing them should not be necessary
    // in code blocks.
    if (node.isCode) {
      brReplacement = '\n';
    } else if (previousNode && previousNode.nodeName === 'BR') {
      brReplacement = '<br/>';
    }

    return brReplacement;
  }
}

rules.heading = {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

  replacement: function (content, node, options) {
    var hLevel = Number(node.nodeName.charAt(1))

    if (options.headingStyle === 'setext' && hLevel < 3) {
      var underline = repeat((hLevel === 1 ? '=' : '-'), content.length)
      return (
        '\n\n' + content + '\n' + underline + '\n\n'
      )
    } else {
      return '\n\n' + repeat('#', hLevel) + ' ' + content + '\n\n'
    }
  }
}

// ==============================
// Joplin format support
// ==============================

rules.highlight = {
  filter: 'mark',

  replacement: function (content, node, options) {
    return '==' + content + '=='
  }
}

// Unlike strikethrough and mark formatting, insert, sup and sub aren't
// widespread enough to automatically convert them to Markdown, but keep them as
// HTML anyway. Another issue is that we use "~" for subscript but that's
// actually the syntax for strikethrough on GitHub, so it's best to keep it as
// HTML to avoid any ambiguity.

rules.insert = {
  filter: function (node, options) {
    // TinyMCE represents this either with an <INS> tag (when pressing the
    // toolbar button) or using style "text-decoration" (when using shortcut
    // Cmd+U)
    //
    // https://github.com/laurent22/joplin/issues/5480
    if (node.nodeName === 'INS') return true;
    return getStyleProp(node, 'text-decoration') === 'underline';
  },

  replacement: function (content, node, options) {
    return '<ins>' + content + '</ins>'
  }
}

rules.superscript = {
  filter: 'sup',

  replacement: function (content, node, options) {
    return '<sup>' + content + '</sup>'
  }
}

rules.subscript = {
  filter: 'sub',

  replacement: function (content, node, options) {
    return '<sub>' + content + '</sub>'
  }
}

// Handles foreground color changes as created by the rich text editor.
// We intentionally don't handle the general style="color: colorhere" case as
// this may leave unwanted formatting when saving websites as markdown.
rules.foregroundColor = {
  filter: function (node, options) {
    return options.preserveColorStyles && node.nodeName === 'SPAN' && getStyleProp(node, 'color');
  },

  replacement: function (content, node, options) {
    return `<span style="color: ${htmlentities(getStyleProp(node, 'color'))};">${content}</span>`;
  },
}

// ==============================
// END Joplin format support
// ==============================

rules.blockquote = {
  filter: 'blockquote',

  replacement: function (content) {
    content = content.replace(/^\n+|\n+$/g, '')
    content = content.replace(/^/gm, '> ')
    return '\n\n' + content + '\n\n'
  }
}

rules.list = {
  filter: ['ul', 'ol'],

  replacement: function (content, node) {
    var parent = node.parentNode
    if (parent && isCodeBlock(parent) && node.classList && node.classList.contains('pre-numbering')){
      // Ignore code-block children of type ul with class pre-numbering.
      // See https://github.com/laurent22/joplin/pull/10126#discussion_r1532204251 .
      // test case: packages/app-cli/tests/html_to_md/code_multiline_2.html
      return '';
    } else if (parent.nodeName === 'LI' && parent.lastElementChild === node) {
      return '\n' + content
    } else {
      return '\n\n' + content + '\n\n'
    }
  }
}

// OL elements are ordered lists, but other elements with a "list-style-type: decimal" style
// should also be considered ordered lists, at least that's how they are rendered
// in browsers.
// https://developer.mozilla.org/en-US/docs/Web/CSS/list-style-type
function isOrderedList(e) {
  if (e.nodeName === 'OL') return true;
  return e.style && e.style.listStyleType === 'decimal';
}

rules.listItem = {
  filter: 'li',

  replacement: function (content, node, options) {
    content = content
        .replace(/^\n+/, '') // remove leading newlines
        .replace(/\n+$/, '\n') // replace trailing newlines with just a single one

    var prefix = options.bulletListMarker + ' '
    if (node.isCode === false) {
      content = content.replace(/\n/gm, '\n    ') // indent
    }
    

    const joplinCheckbox = joplinCheckboxInfo(node);
    if (joplinCheckbox) {
      prefix = '- [' + (joplinCheckbox.checked ? 'x' : ' ') + '] ';
    } else {
      var parent = node.parentNode
      if (isOrderedList(parent)) {
        if (node.isCode) {
          // Ordered lists in code blocks are often for line numbers. Remove them. 
          // See https://github.com/laurent22/joplin/pull/10126
          // test case: packages/app-cli/tests/html_to_md/code_multiline_4.html
          prefix = '';
        } else {
          var start = parent.getAttribute('start')
          var index = Array.prototype.indexOf.call(parent.children, node)
          var indexStr = (start ? Number(start) + index : index + 1) + ''
          // The content of the line that contains the bullet must align wih the following lines.
          //
          // i.e it should be:
          //
          // 9.  my content
          //     second line
          // 10. next one
          //     second line
          //
          // But not:
          //
          // 9.  my content
          //     second line
          // 10.  next one
          //     second line
          //
          prefix = indexStr + '.' + ' '.repeat(3 - indexStr.length)
        }
      }
    } 

    return (
      prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
    )
  }
}

rules.indentedCodeBlock = {
  filter: function (node, options) {
    if (options.codeBlockStyle !== 'indented') return false
    return isCodeBlock(node);
  },

  replacement: function (content, node, options) {
    const handledNode = isCodeBlockSpecialCase1(node) ? node : node.firstChild

    return (
      '\n\n    ' +
      handledNode.textContent.replace(/\n/g, '\n    ') +
      '\n\n'
    )
  }
}

rules.fencedCodeBlock = {
  filter: function (node, options) {
    if (options.codeBlockStyle !== 'fenced') return false;
    return isCodeBlock(node);
  },

  replacement: function (content, node, options) {
    let handledNode = node.firstChild;
    if (isCodeBlockSpecialCase1(node) || isCodeBlockSpecialCase2(node)) handledNode = node;

    var className = handledNode.className || ''
    var language = (className.match(/language-(\S+)/) || [null, ''])[1]
    var code = content

    var fenceChar = options.fence.charAt(0)
    var fenceSize = 3
    var fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm')

    var match
    while ((match = fenceInCodeRegex.exec(code))) {
      if (match[0].length >= fenceSize) {
        fenceSize = match[0].length + 1
      }
    }

    var fence = repeat(fenceChar, fenceSize)

    // remove code block leading and trailing empty lines
    code = code.replace(/^([ \t]*\n)+/, '').trimEnd()

    return (
      '\n\n' + fence + language + '\n' +
      code.replace(/\n$/, '') +
      '\n' + fence + '\n\n'
    )
  }
}

rules.horizontalRule = {
  filter: 'hr',

  replacement: function (content, node, options) {
    return '\n\n' + options.hr + '\n\n'
  }
}

function filterLinkContent (content) {
  return content.trim().replace(/[\n\r]+/g, '<br>')
}

function filterLinkHref (href) {
  if (!href) return ''
  href = href.trim()
  if (href.toLowerCase().indexOf('javascript:') === 0) return '' // We don't want to keep js code in the markdown
  // Replace the spaces with %20 because otherwise they can cause problems for some
  // renderer and space is not a valid URL character anyway.
  href = href.replace(/ /g, '%20');
  // Newlines and tabs also break renderers
  href = href.replace(/\n/g, '%0A');
  href = href.replace(/\t/g, '%09');
  // Brackets also should be escaped
  href = href.replace(/\(/g, '%28');
  href = href.replace(/\)/g, '%29');
  return href
}

function filterImageTitle(title) {
  if (!title) return ''
  title = title.trim()
  title = title.replace(/\"/g, '&quot;');
  title = title.replace(/\(/g, '&#40;');
  title = title.replace(/\)/g, '&#41;');
  return title
}

function getNamedAnchorFromLink(node, options) {
  var id = node.getAttribute('id')
  if (!id) id = node.getAttribute('name')
  if (id) id = id.trim();

  if (id && options.anchorNames.indexOf(id.toLowerCase()) >= 0) {
    return '<a id="' + htmlentities(id) + '"></a>';
  } else {
    return '';
  }
}

function isLinkifiedUrl(url) {
  return url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('file://') === 0;
}

rules.inlineLink = {
  filter: function (node, options) {
    return (
      options.linkStyle === 'inlined' &&
      node.nodeName === 'A' &&
      (node.getAttribute('href') || node.getAttribute('name') || node.getAttribute('id'))
    )
  },

  escapeContent: function (node, _options) {
    // Disable escaping content (including '_'s) when the link has the same URL and href.
    // This prevents links from being broken by added escapes.
    return node.getAttribute('href') !== node.textContent;
  },

  replacement: function (content, node, options) {
    var href = filterLinkHref(node.getAttribute('href'))

    if (!href) {
      return getNamedAnchorFromLink(node, options) + filterLinkContent(content)
    } else {
      var title = node.title && node.title !== href ? ' "' + node.title + '"' : ''
      if (!href) title = ''
      let output = getNamedAnchorFromLink(node, options) + '[' + filterLinkContent(content) + '](' + href + title + ')'

      // If the URL is automatically linkified by Joplin, and the title is
      // the same as the URL, there is no need to make it a link here. That
      // will prevent URsL from the rich text editor to be needlessly
      // converted from this:
      //
      // <a href="https://example.com">https://example.com</a>
      //
      // to this:
      //
      // [https://example.com](https://example.com)
      //
      // It means cleaner Markdown will also be generated by the web
      // clipper.
      if (isLinkifiedUrl(href)) {
        if (output === '[' + href + '](' + href + ')') return href;
      }

      return output;
    }
  }
}

// Normally a named anchor would be <a name="something"></a> but
// you can also find <span id="something">Something</span> so the
// rule below handle this.
// Fixes https://github.com/laurent22/joplin/issues/1876
rules.otherNamedAnchors = {
  filter: function (node, options) {
    return !!getNamedAnchorFromLink(node, options);
  },

  replacement: function (content, node, options) {
    return getNamedAnchorFromLink(node, options) + content;
  }
}

rules.referenceLink = {
  filter: function (node, options) {
    return (
      options.linkStyle === 'referenced' &&
      node.nodeName === 'A' &&
      node.getAttribute('href')
    )
  },

  replacement: function (content, node, options) {
    var href = filterLinkHref(node.getAttribute('href'))
    var title = node.title ? ' "' + node.title + '"' : ''
    if (!href) title = ''
    var replacement
    var reference

    content = filterLinkContent(content)

    switch (options.linkReferenceStyle) {
      case 'collapsed':
        replacement = '[' + content + '][]'
        reference = '[' + content + ']: ' + href + title
        break
      case 'shortcut':
        replacement = '[' + content + ']'
        reference = '[' + content + ']: ' + href + title
        break
      default:
        var id = this.references.length + 1
        replacement = '[' + content + '][' + id + ']'
        reference = '[' + id + ']: ' + href + title
    }

    this.references.push(reference)
    return replacement
  },

  references: [],

  append: function (options) {
    var references = ''
    if (this.references.length) {
      references = '\n\n' + this.references.join('\n') + '\n\n'
      this.references = [] // Reset references
    }
    return references
  }
}

rules.emphasis = {
  filter: ['em', 'i'],

  replacement: function (content, node, options) {
    if (!content.trim()) return ''
    if (node.isCode) return content;
    return options.emDelimiter + content + options.emDelimiter
  }
}

rules.strong = {
  filter: ['strong', 'b'],

  replacement: function (content, node, options) {
    if (!content.trim()) return ''
    if (node.isCode) return content;
    return options.strongDelimiter + content + options.strongDelimiter
  }
}

rules.code = {
  filter: function (node) {
    var hasSiblings = node.previousSibling || node.nextSibling
    var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings

    return node.nodeName === 'CODE' && !isCodeBlock
  },

  replacement: function (content, node, options) {
    if (!content) {
      return ''
    }

    content = content.replace(/\r?\n|\r/g, '\n')
    // If code is multiline and in codeBlock, just return it, codeBlock will add fence(default is ```).
    //
    // This handles the case where a <code> element is nested directly within a <pre> and
    // should not be turned into an inline code region.
    //
    // See https://github.com/laurent22/joplin/pull/10126 .
    if (content.indexOf('\n') !== -1 && node.parentNode && isCodeBlock(node.parentNode)){
      return content
    }

    content = content.replace(/\r?\n|\r/g, '')

    var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? ' ' : ''
    var delimiter = '`'
    var matches = content.match(/`+/gm) || []
    while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + '`'

    return delimiter + extraSpace + content + extraSpace + delimiter
  }
}

function imageMarkdownFromNode(node, options = null) {
  options = Object.assign({}, {
    preserveImageTagsWithSize: false,
  }, options);

  if (options.preserveImageTagsWithSize && (node.getAttribute('width') || node.getAttribute('height'))) {
    return node.outerHTML;
  }

  var alt = node.alt || ''
  var src = filterLinkHref(node.getAttribute('src') || '')
  var title = node.title || ''
  var titlePart = title ? ' "' + filterImageTitle(title) + '"' : ''
  return src ? '![' + alt.replace(/([[\]])/g, '\\$1') + ']' + '(' + src + titlePart + ')' : ''
}

function imageUrlFromSource(node) {
  // Format of srcset can be:
  // srcset="kitten.png"
  // or:
  // srcset="kitten.png, kitten@2X.png 2x"

  let src = node.getAttribute('srcset');
  if (!src) src = node.getAttribute('data-srcset');
  if (!src) return '';

  const s = src.split(',');
  if (!s.length) return '';
  src = s[0];

  src = src.split(' ');
  return src[0];
}

rules.image = {
  filter: 'img',

  replacement: function (content, node, options) {
    return imageMarkdownFromNode(node, options);
  }
}

rules.picture = {
  filter: 'picture',

  replacement: function (content, node, options) {
    if (!node.childNodes) return '';

    let firstSource = null;
    let firstImg = null;

    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];

      if (child.nodeName === 'SOURCE' && !firstSource) firstSource = child;
      if (child.nodeName === 'IMG') firstImg = child;
    }

    if (firstImg && firstImg.getAttribute('src')) {
      return imageMarkdownFromNode(firstImg, options);
    } else if (firstSource) {
      // A <picture> tag can have multiple <source> tag and the browser should decide which one to download
      // but for now let's pick the first one.
      const src = imageUrlFromSource(firstSource);
      return src ? '![](' + src + ')' : '';
    }

    return '';
  }
}

function findFirstDescendant(node, byType, name) {
  for (const childNode of node.childNodes) {
    if (byType === 'class' && childNode.classList.contains(name)) return childNode;
    if (byType === 'nodeName' && childNode.nodeName === name) return childNode;

    const sub = findFirstDescendant(childNode, byType, name);
    if (sub) return sub;
  }
  return null;
}

function findParent(node, byType, name) {
  while (true) {
    const p = node.parentNode;
    if (!p) return null;
    if (byType === 'class' && p.classList && p.classList.contains(name)) return p;
    if (byType === 'nodeName' && p.nodeName === name) return p;
    node = p;
  }
}

// ===============================================================================
// MATHJAX support
//
// When encountering Mathjax elements there's first the rendered Mathjax,
// which we want to skip because it cannot be converted reliably to Markdown.
// This tag is followed by the actual MathJax script in a <script> tag, which
// is what we want to export. By wrapping this text in "$" or "$$" it will
// be displayed correctly by Katex in Joplin.
//
// See mathjax_inline and mathjax_block test cases.
// ===============================================================================

function majaxScriptBlockType(node) {
  if (node.nodeName !== 'SCRIPT') return null;

  const a = node.getAttribute('type');
  if (!a || a.indexOf('math/tex') < 0) return null;

  return a.indexOf('display') >= 0 ? 'block' : 'inline';
}

rules.mathjaxRendered = {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.getAttribute('class') === 'MathJax';
  },

  replacement: function (content, node, options) {
    return '';
  }
}

rules.mathjaxScriptInline = {
  filter: function (node) {
    return majaxScriptBlockType(node) === 'inline';
  },

  escapeContent: function() {
    // We want the raw unescaped content since this is what Katex will need to render
    // If we escape, it will double the \\ in particular.
    return false;
  },

  replacement: function (content, node, options) {
    return '$' + content + '$';
  }
}

rules.mathjaxScriptBlock = {
  filter: function (node) {
    return majaxScriptBlockType(node) === 'block';
  },

  escapeContent: function() {
    return false;
  },

  replacement: function (content, node, options) {
    return '$$\n' + content + '\n$$';
  }
}

// ===============================================================================
// End of MATHJAX support
// ===============================================================================

// ===============================================================================
// Joplin "noMdConv" support
// 
// Tags that have the class "jop-noMdConv" are not converted to Markdown
// but left as HTML. This is useful when converting from MD to HTML, then
// back to MD again. In that case, we'd want to preserve the code that
// was in HTML originally.
// ===============================================================================

rules.joplinHtmlInMarkdown = {
  filter: function (node) {
    // Tables are special because they may be entirely kept as HTML depending on
    // the logic in table.js, for example if they contain code.
    return node && node.classList && node.classList.contains('jop-noMdConv') && node.nodeName !== 'TABLE';
  },

  replacement: function (content, node) {
    node.classList.remove('jop-noMdConv');
    const nodeName = node.nodeName.toLowerCase();
    let attrString = attributesHtml(node.attributes, { skipEmptyClass: true });
    if (attrString) attrString = ' ' + attrString;
    return '<' + nodeName + attrString + '>' + content + '</' + nodeName + '>';
  }
}

// ===============================================================================
// Joplin Source block support
// 
// This is specific to Joplin: a plugin may convert some Markdown to HTML
// but keep the original source in a hidden <PRE class="joplin-source"> block.
// In that case, when we convert back again from HTML to MD, we use that
// block for lossless conversion.
// ===============================================================================

function joplinEditableBlockInfo(node) {
  if (!node.classList.contains('joplin-editable')) return null;

  let sourceNode = null;
  let isInline = false;
  for (const childNode of node.childNodes) {
    if (childNode.classList.contains('joplin-source')) {
      sourceNode = childNode;
      break;
    }
  }

  if (!sourceNode) return null;
  if (!node.isBlock) isInline = true;

  return {
    openCharacters: sourceNode.getAttribute('data-joplin-source-open'),
    closeCharacters: sourceNode.getAttribute('data-joplin-source-close'),
    content: sourceNode.textContent,
    isInline
  };
}

rules.joplinSourceBlock = {
  filter: function (node) {
    return !!joplinEditableBlockInfo(node);
  },

  escapeContent: function() {
    return false;
  },

  replacement: function (content, node, options) {
    const info = joplinEditableBlockInfo(node);
    if (!info) return;

    const surroundingCharacter = info.isInline? '' : '\n\n';
    return surroundingCharacter + info.openCharacters + info.content + info.closeCharacters + surroundingCharacter;
  }
}


// ===============================================================================
// Checkboxes
// ===============================================================================

function joplinCheckboxInfo(liNode) {
  if (liNode.classList.contains('joplin-checkbox')) {
    // Handling of this rendering is buggy as it adds extra new lines between each
    // list item. However, supporting this rendering is normally no longer needed.
    const input = findFirstDescendant(liNode, 'nodeName', 'INPUT');
    return {
      checked: input && input.getAttribute ? !!input.getAttribute('checked') : false,
      renderingType: 1,
    };
  }

  const parentChecklist = findParent(liNode, 'class', 'joplin-checklist');
  if (parentChecklist) {
    return {
      checked: !!liNode.classList && liNode.classList.contains('checked'),
      renderingType: 2,
    };
  }

  return null;
}

export default rules
