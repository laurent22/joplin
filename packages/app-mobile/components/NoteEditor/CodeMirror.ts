/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `npm run buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { MarkdownMathExtension } from './MarkdownMathParser';
import codeMirrorDecorator from './CodeMirrorDecorator';
import createTheme from './CodeMirrorTheme';
import syntaxHighlightingLanguages from './CodeMirrorLanguages';

import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { indentOnInput, indentUnit } from '@codemirror/language';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { EditorView, drawSelection, highlightSpecialChars, ViewUpdate } from '@codemirror/view';
import { undo, redo, history, undoDepth, redoDepth } from '@codemirror/commands';

import { keymap } from '@codemirror/view';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';

import { EditorControl, EditorSettings } from './EditorType';
import { ChangeEvent, SelectionChangeEvent, Selection } from './EditorType';


function postMessage(name: string, data: any) {
	(window as any).ReactNativeWebView.postMessage(JSON.stringify({
		data,
		name,
	}));
}

function logMessage(...msg: any[]) {
	postMessage('onLog', { value: msg });
}

export function initCodeMirror(
	parentElement: any, initialText: string, settings: EditorSettings
): EditorControl {
	logMessage('Initializing CodeMirror...');
	const theme = settings.themeData;

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

	function notifyDocChanged(viewUpdate: ViewUpdate) {
		if (viewUpdate.docChanged) {
			const event: ChangeEvent = {
				value: editor.state.doc.toString(),
			};

			postMessage('onChange', event);
			schedulePostUndoRedoDepthChange(editor);
		}
	}

	function notifySelectionChange(viewUpdate: ViewUpdate) {
		if (!viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const mainRange = viewUpdate.state.selection.main;
			const selection: Selection = {
				start: mainRange.from,
				end: mainRange.to,
			};
			const event: SelectionChangeEvent = {
				selection,
			};
			postMessage('onSelectionChange', event);
		}
	}

	const editor = new EditorView({
		state: EditorState.create({
			// See https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
			// for a sample configuration.
			extensions: [
				markdown({
					extensions: [
						GFM,

						// Don't highlight KaTeX if the user disabled it
						settings.katexEnabled ? MarkdownMathExtension : [],
					],
					codeLanguages: syntaxHighlightingLanguages,
				}),
				...createTheme(theme),
				history(),
				search(),
				drawSelection(),
				highlightSpecialChars(),
				highlightSelectionMatches(),
				indentOnInput(),

				// By default, indent with a tab
				indentUnit.of('\t'),

				// Full-line styling
				codeMirrorDecorator,

				EditorView.lineWrapping,
				EditorView.contentAttributes.of({ autocapitalize: 'sentence' }),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					notifyDocChanged(viewUpdate);
					notifySelectionChange(viewUpdate);
				}),
				keymap.of([
					...defaultKeymap, ...historyKeymap, indentWithTab, ...searchKeymap,
				]),
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
		select: (anchor: number, head: number) => {
			editor.dispatch(editor.state.update({
				selection: { anchor, head },
				scrollIntoView: true,
			}));
		},
		insertText: (text: string) => {
			editor.dispatch(editor.state.replaceSelection(text));
		},
	};
}
