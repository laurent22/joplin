import { Attrs, ContentMatch, NodeType, ResolvedPos, Node } from "prosemirror-model"
import { canSplit } from "prosemirror-transform"
import { Selection, TextSelection, AllSelection, Transaction, NodeSelection } from "prosemirror-state"

// Slightly modified from the prosemirror-commands package:
// https://github.com/ProseMirror/prosemirror-tables/blob/a99f70855f2b3e2433bc77451fedd884305fda5b/src/fixtables.ts#L17C1-L47C2
// Modified to adjust the API of the splitBlockAs command to allow using it
// within another command, as per https://discuss.prosemirror.net/t/refactor-commands-into-transform-helpers/479.
//
//! Copyright (C) 2015-2017 by Marijn Haverbeke <marijnh@gmail.com> and others
//! 
//! Permission is hereby granted, free of charge, to any person obtaining a copy
//! of this software and associated documentation files (the "Software"), to deal
//! in the Software without restriction, including without limitation the rights
//! to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//! copies of the Software, and to permit persons to whom the Software is
//! furnished to do so, subject to the following conditions:
//! 
//! The above copyright notice and this permission notice shall be included in
//! all copies or substantial portions of the Software.
//! 
//! THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//! IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//! FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//! AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//! LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//! OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//! THE SOFTWARE.

function defaultBlockAt(match: ContentMatch) {
  for (let i = 0; i < match.edgeCount; i++) {
    let {type} = match.edge(i)
    if (type.isTextblock && !type.hasRequiredAttrs()) return type
  }
  return null
}


/// Create a variant of [`splitBlock`](#commands.splitBlock) that uses
/// a custom function to determine the type of the newly split off block.
function splitBlockAs(
  splitNode?: (node: Node, atEnd: boolean, $from: ResolvedPos) => {type: NodeType, attrs?: Attrs} | null
) {
  // Update: Accept a selection and a transaction rather than a state and dispatch function.
  return (selection: Selection, tr: Transaction) => {
    let {$from, $to} = selection
    if (selection instanceof NodeSelection && selection.node.isBlock) {
      if (!$from.parentOffset || !canSplit(tr.doc, $from.pos)) return false
      return tr.split($from.pos).scrollIntoView()
    }

    if (!$from.depth) return false
    let types: (null | {type: NodeType, attrs?: Attrs | null})[] = []
    let splitDepth, deflt, atEnd = false, atStart = false
    for (let d = $from.depth;; d--) {
      let node = $from.node(d)
      if (node.isBlock) {
        atEnd = $from.end(d) == $from.pos + ($from.depth - d)
        atStart = $from.start(d) == $from.pos - ($from.depth - d)
        deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)))
        let splitType = splitNode && splitNode($to.parent, atEnd, $from)
        types.unshift(splitType || (atEnd && deflt ? {type: deflt} : null))
        splitDepth = d
        break
      } else {
        if (d == 1) return false
        types.unshift(null)
      }
    }

    if (selection instanceof TextSelection || selection instanceof AllSelection) tr.deleteSelection()
    let splitPos = tr.mapping.map($from.pos)
    let can = canSplit(tr.doc, splitPos, types.length, types)
    if (!can) {
      types[0] = deflt ? {type: deflt} : null
      can = canSplit(tr.doc, splitPos, types.length, types)
    }
    if (!can) return false
    tr.split(splitPos, types.length, types)
    if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
      let first = tr.mapping.map($from.before(splitDepth)), $first = tr.doc.resolve(first)
      if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
        tr.setNodeMarkup(tr.mapping.map($from.before(splitDepth)), deflt)
    }
    return tr.scrollIntoView()
  }
}

export default splitBlockAs;