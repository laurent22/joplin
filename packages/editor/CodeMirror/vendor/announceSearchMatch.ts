import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

// From https://github.com/codemirror/search/blob/3fd68b965a1a149bb65a268ef52c10b36c080538/src/search.ts
// Modified to accept an EditorState instead of an EditorView.
//!
//! MIT License
//! 
//! Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
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
//!

const AnnounceMargin = 30

const Break = /[\s\.,:;?!]/

export default function announceSearchMatch(state: EditorState, {from, to}: {from: number, to: number}) {
  let line = state.doc.lineAt(from), lineEnd = state.doc.lineAt(to).to
  let start = Math.max(line.from, from - AnnounceMargin), end = Math.min(lineEnd, to + AnnounceMargin)
  let text = state.sliceDoc(start, end)
  if (start != line.from) {
    for (let i = 0; i < AnnounceMargin; i++) if (!Break.test(text[i + 1]) && Break.test(text[i])) {
      text = text.slice(i)
      break
    }
  }
  if (end != lineEnd) {
    for (let i = text.length - 1; i > text.length - AnnounceMargin; i--) if (!Break.test(text[i - 1]) && Break.test(text[i])) {
      text = text.slice(0, i)
      break
    }
  }

  return EditorView.announce.of(
    `${state.phrase("current match")}. ${text} ${state.phrase("on line")} ${line.number}.`)
}
