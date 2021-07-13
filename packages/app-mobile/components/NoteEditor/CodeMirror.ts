/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `npm run buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightSpecialChars, ViewUpdate } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { undo, redo, history, undoDepth, redoDepth } from '@codemirror/history';

interface CodeMirrorResult {
	editor: EditorView;
	undo: Function;
	redo: Function;
}

function postMessage(name: string, data: any) {
	(window as any).ReactNativeWebView.postMessage(JSON.stringify({
		data,
		name,
	}));
}

function logMessage(...msg: any[]) {
	postMessage('onLog', { value: msg });
}

export function initCodeMirror(parentElement: any, initialText: string): CodeMirrorResult {
	logMessage('Initializing CodeMirror...');

	let schedulePostUndoRedoDepthChangeId_: any = 0;
	function schedulePostUndoRedoDepthChange(editor: EditorView, doItNow: boolean = false) {
		if (schedulePostUndoRedoDepthChangeId_) {
			if (doItNow) {
				clearTimeout(schedulePostUndoRedoDepthChangeId_);
			} else {
				return;
			}
		}

		schedulePostUndoRedoDepthChangeId_ = setTimeout(() => {
			schedulePostUndoRedoDepthChangeId_ = null;
			postMessage('onUndoRedoDepthChange', {
				undoDepth: undoDepth(editor.state),
				redoDepth: redoDepth(editor.state),
			});
		}, doItNow ? 0 : 1000);
	}

	const editor = new EditorView({
		state: EditorState.create({
			extensions: [
				markdown(),
				history(),
				drawSelection(),
				highlightSpecialChars(),
				EditorView.lineWrapping,
				defaultHighlightStyle.fallback,
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					if (viewUpdate.docChanged) {
						postMessage('onChange', { value: editor.state.doc.toString() });
						schedulePostUndoRedoDepthChange(editor);
					}
				}),
			],
			doc: initialText,
		}),
		parent: parentElement,
	});

	return {
		editor,
		undo: () => {
			undo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		redo: () => {
			redo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
	};
}
