/* eslint-disable import/prefer-default-export */

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
