import COMMONMARK_RULES from './commonmark-rules'
import Rules from './rules'
import { extend, isCodeBlock, trimLeadingNewlines, trimTrailingNewlines } from './utilities'
import RootNode from './root-node'
import Node from './node'
var reduce = Array.prototype.reduce
var escapes = [
  [/\\/g, '\\\\'],
  [/\*/g, '\\*'],
  [/^-/g, '\\-'],
  [/^\+ /g, '\\+ '],
  [/^(=+)/g, '\\$1'],
  [/^(#{1,6}) /g, '\\$1 '],
  [/`/g, '\\`'],
  [/^~~~/g, '\\~~~'],
  [/\[/g, '\\['],
  [/\]/g, '\\]'],
  [/^>/g, '\\>'],
  // A list of valid \p values can be found here: https://unicode.org/reports/tr44/#GC_Values_Table
  [/(^|\p{Punctuation}|\p{Separator}|\p{Symbol})_(\P{Separator})/ug, '$1\\_$2'],
  [/^(\d+)\. /g, '$1\\. ']
]

export default function TurndownService (options) {
  if (!(this instanceof TurndownService)) return new TurndownService(options)

  var defaults = {
    rules: COMMONMARK_RULES,
    headingStyle: 'setext',
    hr: '* * *',
    bulletListMarker: '*',
    codeBlockStyle: 'indented',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
    anchorNames: [],
    br: '  ',
    disableEscapeContent: false,
    preformattedCode: false,
    preserveNestedTables: false,
    preserveColorStyles: false,
    blankReplacement: function (content, node) {
      return node.isBlock ? '\n\n' : ''
    },
    keepReplacement: function (content, node) {
      // In markdown, multiple blank lines end an HTML block. We thus
      // include an HTML comment to make otherwise blank lines not blank.
      const mutliBlankLineRegex = /\n([ \t\r]*)\n/g;

      // We run the replacement multiple times to handle multiple blank
      // lines in a row.
      //
      // For example, "Foo\n\n\nBar" becomes "Foo\n<!-- -->\n\nBar" after the
      // first replacement.
      let html = node.outerHTML;
      while (html.match(mutliBlankLineRegex)) {
        html = html.replace(mutliBlankLineRegex, '\n<!-- -->$1\n');
      }

      return node.isBlock ? '\n\n' + html + '\n\n' : html
    },
    defaultReplacement: function (content, node) {
      return node.isBlock ? '\n\n' + content + '\n\n' : content
    }
  }
  this.options = extend({}, defaults, options)
  this.rules = new Rules(this.options)
}

TurndownService.prototype = {
  /**
   * The entry point for converting a string or DOM node to Markdown
   * @public
   * @param {String|HTMLElement} input The string or DOM node to convert
   * @returns A Markdown representation of the input
   * @type String
   */

  turndown: function (input) {
    if (!canConvert(input)) {
      throw new TypeError(
        input + ' is not a string, or an element/document/fragment node.'
      )
    }

    if (input === '') return ''

    var output = process.call(this, new RootNode(input, this.options))
    return postProcess.call(this, output)
  },

  /**
   * Add one or more plugins
   * @public
   * @param {Function|Array} plugin The plugin or array of plugins to add
   * @returns The Turndown instance for chaining
   * @type Object
   */

  use: function (plugin) {
    if (Array.isArray(plugin)) {
      for (var i = 0; i < plugin.length; i++) this.use(plugin[i])
    } else if (typeof plugin === 'function') {
      plugin(this)
    } else {
      throw new TypeError('plugin must be a Function or an Array of Functions')
    }
    return this
  },

  /**
   * Adds a rule
   * @public
   * @param {String} key The unique key of the rule
   * @param {Object} rule The rule
   * @returns The Turndown instance for chaining
   * @type Object
   */

  addRule: function (key, rule) {
    this.rules.add(key, rule)
    return this
  },

  /**
   * Keep a node (as HTML) that matches the filter
   * @public
   * @param {String|Array|Function} filter The unique key of the rule
   * @returns The Turndown instance for chaining
   * @type Object
   */

  keep: function (filter) {
    this.rules.keep(filter)
    return this
  },

  /**
   * Remove a node that matches the filter
   * @public
   * @param {String|Array|Function} filter The unique key of the rule
   * @returns The Turndown instance for chaining
   * @type Object
   */

  remove: function (filter) {
    this.rules.remove(filter)
    return this
  },

  /**
   * Escapes Markdown syntax
   * @public
   * @param {String} string The string to escape
   * @returns A string with Markdown syntax escaped
   * @type String
   */

  escape: function (string) {
    return escapes.reduce(function (accumulator, escape) {
      return accumulator.replace(escape[0], escape[1])
    }, string)
  },

  isCodeBlock: function(node) {
    return isCodeBlock(node);
  },

}

/**
 * Reduces a DOM node down to its Markdown string equivalent
 * @private
 * @param {HTMLElement} parentNode The node to convert
 * @returns A Markdown representation of the node
 * @type String
 */

function process (parentNode, escapeContent = 'auto') {
  if (this.options.disableEscapeContent) escapeContent = false;

  let output = '';
  let previousNode = null;

  for (let node of parentNode.childNodes) {
    node = new Node(node, this.options);

    var replacement = ''
    if (node.nodeType === 3) {
      if (node.isCode || escapeContent === false) {
        replacement = node.nodeValue
      } else {
        replacement = this.escape(node.nodeValue);

        // Escape < and > so that, for example, this kind of HTML text: "This is a tag: &lt;p&gt;" is still rendered as "This is a tag: &lt;p&gt;"
        // and not "This is a tag: <p>". If the latter, it means the HTML will be rendered if the viewer supports HTML (which, in Joplin, it does).
        replacement = replacement.replace(/<(.+?)>/g, '&lt;$1&gt;');
      }
    } else if (node.nodeType === 1) {
      replacement = replacementForNode.call(this, node, previousNode);
    }

    output = join(output, replacement, parentNode.isCode);
    previousNode = node;
  }

  return output;
}

/**
 * Appends strings as each rule requires and trims the output
 * @private
 * @param {String} output The conversion output
 * @returns A trimmed version of the ouput
 * @type String
 */

function postProcess (output) {
  var self = this
  this.rules.forEach(function (rule) {
    if (typeof rule.append === 'function') {
      output = join(output, rule.append(self.options), false)
    }
  })

  return output.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '')
}

/**
 * Converts an element node to its Markdown equivalent
 * @private
 * @param {HTMLElement} node The node to convert
 * @param {HTMLElement|null} previousNode The node immediately before this node.
 * @returns A Markdown representation of the node
 * @type String
 */

function replacementForNode (node, previousNode) {
  var rule = this.rules.forNode(node)
  var content = process.call(this, node, rule.escapeContent ? rule.escapeContent(node) : 'auto')
  var whitespace = node.flankingWhitespace
  if (whitespace.leading || whitespace.trailing){
    if (node.isCode) {
      // Fix: Web clipper has trouble with code blocks on Joplin's website.
      // See https://github.com/laurent22/joplin/pull/10126#issuecomment-2016523281 .
      // if isCode, keep line breaks
      //test case: packages/app-cli/tests/html_to_md/code_multiline_1.html
      //test case: packages/app-cli/tests/html_to_md/code_multiline_3.html

      //If the leading blank of current node or leading blank of current node including line breaks, and the leading blank of current node is equal to the leading blank of it's first child node, and the trailing blank of the current node is equal to the leading blank of it's last child node, it indicates that the leading blank and leading blank of current node is from it's child nodes, so should not be added repeatedly, this remove multiple line breaks.
      //test case: packages/app-cli/tests/html_to_md/code_multiline_5.html
      if ( (whitespace.leading.indexOf('\n') !== -1 || whitespace.trailing.indexOf('\n') !== -1) && 
        node.childNodes && node.childNodes.length > 0) {

        var firstChildWhitespace = node.childNodes[0].flankingWhitespace
        var lastChildWhitespace = node.childNodes[node.childNodes.length-1].flankingWhitespace

        if (whitespace.leading === firstChildWhitespace.leading && 
          whitespace.trailing === lastChildWhitespace.trailing) {
            content = content.trim()
        }
      } else {
        // keep line breaks
        content = content.replace(/^[ \t]+|[ \t]+$/g, '');
      }
    } else {
      content = content.trim()
    }
  }
  
  return (
    whitespace.leading +
    rule.replacement(content, node, this.options, previousNode) +
    whitespace.trailing
  )
}

/**
 * Joins replacement to the current output with appropriate number of new lines
 * @private
 * @param {String} output The current conversion output
 * @param {String} replacement The string to append to the output
 * @returns Joined output
 * @type String
 */

function join (output, replacement, isCode) {
  if (isCode === true) {
    // Fix: Web clipper has trouble with code blocks on Joplin's website.
    // See https://github.com/laurent22/joplin/pull/10126#issuecomment-2016523281 .
    // If isCode, keep line breaks
    return output + replacement
  } else {
    var s1 = trimTrailingNewlines(output)
    var s2 = trimLeadingNewlines(replacement)
    var nls = Math.max(output.length - s1.length, replacement.length - s2.length)
    var separator = '\n\n'.substring(0, nls)

    return s1 + separator + s2
  }  
}

/**
 * Determines whether an input can be converted
 * @private
 * @param {String|HTMLElement} input Describe this parameter
 * @returns Describe what it returns
 * @type String|Object|Array|Boolean|Number
 */

function canConvert (input) {
  return (
    input != null && (
      typeof input === 'string' ||
      (input.nodeType && (
        input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11
      ))
    )
  )
}
