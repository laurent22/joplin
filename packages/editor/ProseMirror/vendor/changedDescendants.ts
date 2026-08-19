// From the prosemirror-tables package:
// https://github.com/ProseMirror/prosemirror-tables/blob/a99f70855f2b3e2433bc77451fedd884305fda5b/src/fixtables.ts#L17C1-L47C2
//! Copyright (C) 2015-2016 by Marijn Haverbeke <marijnh@gmail.com> and others
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

import { Node } from 'prosemirror-model';

// eslint-disable -- A mirror of code from an external source

/**
 * Helper for iterating through the nodes in a document that changed
 * compared to the given previous document. Useful for avoiding
 * duplicate work on each transaction.
 *
 * @public
 */
function changedDescendants(
  old: Node,
  cur: Node,
  offset: number,
  f: (node: Node, pos: number) => void,
): void {
  const oldSize = old.childCount,
    curSize = cur.childCount;
  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = cur.child(i);
    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (old.child(scan) == child) {
        j = scan + 1;
        offset += child.nodeSize;
        continue outer;
      }
    }
    f(child, offset);
    if (j < oldSize && old.child(j).sameMarkup(child))
      changedDescendants(old.child(j), child, offset + 1, f);
    else child.nodesBetween(0, child.content.size, f, offset + 1);
    offset += child.nodeSize;
  }
}

export default changedDescendants;