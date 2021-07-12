/* eslint-disable import/prefer-default-export */

import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightSpecialChars } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle } from '@codemirror/highlight';

export function initCodeMirror(parentElement: any): EditorView {
	const editor = new EditorView({
		state: EditorState.create({
			extensions: [
				markdown(),
				drawSelection(),
				highlightSpecialChars(),
				EditorView.lineWrapping,
				defaultHighlightStyle.fallback,
			],
		}),
		parent: parentElement,
	});

	return editor;
}
