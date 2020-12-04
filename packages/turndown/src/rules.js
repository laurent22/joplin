/**
 * Manages a collection of rules used to convert HTML to Markdown
 */

export default function Rules (options) {
  this.options = options
  this._keep = []
  this._remove = []

  this.blankRule = {
    replacement: options.blankReplacement
  }

  this.keepReplacement = options.keepReplacement

  this.defaultRule = {
    replacement: options.defaultReplacement
  }

  this.array = []
  for (var key in options.rules) this.array.push(options.rules[key])
}

Rules.prototype = {
  add: function (key, rule) {
    this.array.unshift(rule)
  },

  keep: function (filter) {
    this._keep.unshift({
      filter: filter,
      replacement: this.keepReplacement
    })
  },

  remove: function (filter) {
    this._remove.unshift({
      filter: filter,
      replacement: function () {
        return ''
      }
    })
  },

  forNode: function (node) {
    if (node.isBlank) return this.blankRule
    var rule

    if ((rule = findRule(this.array, node, this.options))) return rule
    if ((rule = findRule(this._keep, node, this.options))) return rule
    if ((rule = findRule(this._remove, node, this.options))) return rule

    return this.defaultRule
  },

  forEach: function (fn) {
    for (var i = 0; i < this.array.length; i++) fn(this.array[i], i)
  }
}

function findRule (rules, node, options) {
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i]
    if (filterValue(rule, node, options)) return rule
  }
  return void 0
}

function filterValue (rule, node, options) {
  var filter = rule.filter
  if (typeof filter === 'string') {
    if (filter === node.nodeName.toLowerCase()) return true
  } else if (Array.isArray(filter)) {
    if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true
  } else if (typeof filter === 'function') {
    if (filter.call(rule, node, options)) return true
  } else {
    throw new TypeError('`filter` needs to be a string, array, or function')
  }
}
