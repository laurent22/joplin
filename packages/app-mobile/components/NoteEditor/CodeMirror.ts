/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `npm run buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { EditorState, Extension } from '@codemirror/state';
import { EditorView, drawSelection, highlightSpecialChars, ViewUpdate } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, HighlightStyle, tags } from '@codemirror/highlight';
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

// For an example on how to customize the theme, see:
//
// https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
//
// Use Safari developer tools to view the content of the CodeMirror iframe while
// the app is running. It seems that what appears as ".ͼ1" in the CSS is the
// equivalent of "&" in the theme object. So to target ".ͼ1.cm-focused", you'd
// use '&.cm-focused' in the theme.
const createTheme = (theme: any): Extension => {
	const baseTheme = EditorView.baseTheme({
		'&': {
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontFamily: theme.fontFamily,
			fontSize: `${theme.fontSize}px`,
		},

		'&.cm-focused': {
			outline: 'none',
		},
	});

	const appearanceTheme = EditorView.theme({}, { dark: theme.appearance === 'dark' });

	const baseHeadingStyle = {
		fontWeight: 'bold',
		fontFamily: theme.fontFamily,
	};

	const syntaxHighlighting = HighlightStyle.define([
		{
			tag: tags.strong,
			fontWeight: 'bold',
		},
		{
			tag: tags.emphasis,
			fontStyle: 'italic',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading1,
			fontSize: '1.6em',
			borderBottom: `1px solid ${theme.dividerColor}`,
		},
		{
			...baseHeadingStyle,
			tag: tags.heading2,
			fontSize: '1.4em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading3,
			fontSize: '1.3em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading4,
			fontSize: '1.2em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading5,
			fontSize: '1.1em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading6,
			fontSize: '1.0em',
		},
		{
			tag: tags.list,
			fontFamily: theme.fontFamily,
		},
	]);

	return [
		baseTheme,
		appearanceTheme,
		syntaxHighlighting,
	];
};

export function initCodeMirror(parentElement: any, initialText: string, theme: any): CodeMirrorResult {
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
				createTheme(theme),
				history(),
				drawSelection(),
				highlightSpecialChars(),
				EditorView.lineWrapping,
				EditorView.contentAttributes.of({ autocapitalize: 'sentence' }),
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
