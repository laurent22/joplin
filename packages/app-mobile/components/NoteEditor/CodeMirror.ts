/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `npm run buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { SelectionFormatting } from './EditorType';

import { EditorState, Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import { EditorView, drawSelection, highlightSpecialChars, ViewUpdate } from '@codemirror/view';
import { undo, redo, history, undoDepth, redoDepth } from '@codemirror/commands';

import { keymap } from '@codemirror/view';
import { indentOnInput, syntaxTree } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap, defaultKeymap } from '@codemirror/commands';

import { SelectionRange, EditorSelection } from '@codemirror/state';

interface CodeMirrorResult {
	editor: EditorView;
	undo: Function;
	redo: Function;
	select: (anchor: number, head: number)=> void;
	insertText: (text: string)=> void;
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
// For a tutorial, see:
//
// https://codemirror.net/6/examples/styling/#themes
//
// Use Safari developer tools to view the content of the CodeMirror iframe while
// the app is running. It seems that what appears as ".ͼ1" in the CSS is the
// equivalent of "&" in the theme object. So to target ".ͼ1.cm-focused", you'd
// use '&.cm-focused' in the theme.
const createTheme = (theme: any): Extension[] => {
	const isDarkTheme = theme.appearance === 'dark';

	const baseGlobalStyle: Record<string, string> = {
		color: theme.color,
		backgroundColor: theme.backgroundColor,
		fontFamily: theme.fontFamily,
		fontSize: `${theme.fontSize}px`,
	};
	const baseCursorStyle: Record<string, string> = { };
	const baseContentStyle: Record<string, string> = { };
	const baseSelectionStyle: Record<string, string> = { };

	// If we're in dark mode, the caret and selection are difficult to see.
	// Adjust them appropriately
	if (isDarkTheme) {
		// Styling the caret requires styling both the caret itself
		// and the CodeMirror caret.
		// See https://codemirror.net/6/examples/styling/#themes
		baseContentStyle.caretColor = 'white';
		baseCursorStyle.borderLeftColor = 'white';

		baseSelectionStyle.backgroundColor = '#6b6b6b';
	}

	const baseTheme = EditorView.baseTheme({
		'&': baseGlobalStyle,

		// These must be !important or more specific than CodeMirror's built-ins
		'.cm-content': baseContentStyle,
		'&.cm-focused .cm-cursor': baseCursorStyle,
		'&.cm-focused .cm-selectionBackground, ::selection': baseSelectionStyle,

		'&.cm-focused': {
			outline: 'none',
		},
	});

	const appearanceTheme = EditorView.theme({}, { dark: isDarkTheme });

	const baseHeadingStyle = {
		fontWeight: 'bold',
		fontFamily: theme.fontFamily,
	};

	const highlightingStyle = HighlightStyle.define([
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
		syntaxHighlighting(highlightingStyle),

		// If we haven't defined highlighting for tags, fall back
		// to the default.
		syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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

	function notifyDocChanged(viewUpdate: ViewUpdate) {
		if (viewUpdate.docChanged) {
			postMessage('onChange', { value: editor.state.doc.toString() });
			schedulePostUndoRedoDepthChange(editor);
		}
	}

	function notifySelectionChange(viewUpdate: ViewUpdate) {
		if (!viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const mainRange = viewUpdate.state.selection.main;
			const selStart = mainRange.from;
			const selEnd = mainRange.to;
			postMessage('onSelectionChange', { selection: { start: selStart, end: selEnd } });
		}
	}

	function notifySelectionFormattingChange(viewUpdate: ViewUpdate) {
		if (viewUpdate.docChanged || !viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const oldFormatting = computeSelectionFormatting(viewUpdate.startState);
			const newFormatting = computeSelectionFormatting(viewUpdate.state);

			if (!oldFormatting.eq(newFormatting)) {
				postMessage('onSelectionFormattingChange', newFormatting.toJSON());
			}
		}
	}

	function computeSelectionFormatting(state: EditorState) {
		const range = state.selection.main;
		const formatting: SelectionFormatting = new SelectionFormatting();

		// Find the smallest range.
		syntaxTree(state).iterate({
			from: range.from, to: range.to,
			enter: node => {
				// Only handle notes that contain the entire range.
				if (node.from > range.from || node.to < range.to) {
					return;
				}

				switch (node.name) {
				case 'StrongEmphasis':
					formatting.bolded = true;
					break;
				case 'Emphasis':
					formatting.italicized = true;
					break;
				}
			},
		});

		return formatting;
	}

	const editor = new EditorView({
		state: EditorState.create({
			// See https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
			// for a sample configuration.
			extensions: [
				markdown({
					extensions: [GFM],
				}),
				...createTheme(theme),
				history(),
				search(),
				drawSelection(),
				highlightSpecialChars(),
				highlightSelectionMatches(),
				indentOnInput(),

				EditorView.lineWrapping,
				EditorView.contentAttributes.of({ autocapitalize: 'sentence' }),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					notifyDocChanged(viewUpdate);
					notifySelectionChange(viewUpdate);
					notifySelectionFormattingChange(viewUpdate);
				}),
				keymap.of([
					...defaultKeymap, ...historyKeymap, ...searchKeymap,
				]),
			],
			doc: initialText,
		}),
		parent: parentElement,
	});

	const editorControls = {
		editor,
		undo() {
			undo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		redo() {
			redo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		select(anchor: number, head: number) {
			editor.dispatch(editor.state.update({
				selection: { anchor, head },
				scrollIntoView: true,
			}));
		},
		insertText(text: string) {
			editor.dispatch(editor.state.replaceSelection(text));
		},
		selectionCommands: {
			// Expands selections to the smallest container node
			// with name [nodeName].
			growSelectionToNode(nodeName: string) {
				const selectionRanges = editor.state.selection.ranges.map((range: SelectionRange) => {
					let newFrom = null;
					let newTo = null;
					let smallestLen = Infinity;

					// Find the smallest range.
					syntaxTree(editor.state).iterate({
						from: range.from, to: range.to,
						enter: node => {
							if (node.name == nodeName) {
								if (node.to - node.from < smallestLen) {
									newFrom = node.from;
									newTo = node.to;
									smallestLen = newTo - newFrom;
								}
							}
						},
					});

					// If it's in such a node,
					if (newFrom != null && newTo != null) {
						return EditorSelection.range(newFrom, newTo);
					} else {
						return range;
					}
				});

				editor.dispatch({
					selection: EditorSelection.create(selectionRanges),
				});
			},

			// Adds/removes [before] before the current selection and [after]
			// after it.
			// For example, surroundSelecton('**', '**') surrounds every selection
			// range with asterisks (including the caret).
			// If the selection is already surrounded by these characters, they are
			// removed.
			surroundSelection(before: string, after: string) {
				// Ref: https://codemirror.net/examples/decoration/
				const changes = editor.state.changeByRange((sel: SelectionRange) => {
					let content = editor.state.doc.sliceString(sel.from, sel.to);
					const startsWithBefore = content.indexOf(before) == 0;
					const endsWithAfter = content.lastIndexOf(after) == content.length - after.length;

					const changes = [];
					let finalSelStart = sel.from;
					let finalSelStop = sel.to;

					if (startsWithBefore && endsWithAfter) {
						// Remove the before and after.
						content = content.substring(before.length);
						content = content.substring(0, content.length - after.length);

						finalSelStop -= before.length + after.length;

						changes.push({
							from: sel.from,
							to: sel.to,
							insert: content,
						});
					} else {
						changes.push({
							from: sel.from,
							insert: before,
						});

						changes.push({
							from: sel.to,
							insert: after,
						});

						// If not a caret,
						if (!sel.empty) {
							// Select the surrounding chars.
							finalSelStop += before.length + after.length;
						} else {
							// Position the caret within the added content.
							finalSelStart = sel.from + before.length;
							finalSelStop = finalSelStart;
						}
					}

					return {
						changes,
						range: EditorSelection.range(finalSelStart, finalSelStop),
					};
				});

				editor.dispatch(changes);
			},

			// Bolds/unbolds the current selection.
			bold() {
				// TODO:
				// if isBolded,
				//    ;
				editorControls.selectionCommands.growSelectionToNode('StrongEmphasis');
				editorControls.selectionCommands.surroundSelection('**', '**');
			},

			// Italicizes/deitalicizes the current selection.
			italicize() {
				editorControls.selectionCommands.growSelectionToNode('Emphasis');
				editorControls.selectionCommands.surroundSelection('_', '_');
			},
		},
	};

	return editorControls;
}

