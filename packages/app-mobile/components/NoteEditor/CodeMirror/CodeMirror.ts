/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `npm run buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { MarkdownMathExtension } from './markdownMathParser';
import codeMirrorDecorator from './decorators';
import createTheme from './theme';
import syntaxHighlightingLanguages from './languages';

import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { indentOnInput, indentUnit, syntaxTree } from '@codemirror/language';
import { closeSearchPanel, highlightSelectionMatches, openSearchPanel, search } from '@codemirror/search';
import { EditorView, drawSelection, highlightSpecialChars, ViewUpdate, Command } from '@codemirror/view';
import { undo, redo, history, undoDepth, redoDepth } from '@codemirror/commands';

import { keymap, KeyBinding } from '@codemirror/view';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';

import { CodeMirrorControl } from './types';
import { EditorSettings, ListType } from '../types';
import { ChangeEvent, SelectionChangeEvent, Selection } from '../types';
import SelectionFormatting from '../SelectionFormatting';
import { logMessage, postMessage } from './webviewLogger';
import { decreaseIndent, increaseIndent, toggleBolded, toggleCode, toggleHeaderLevel, toggleItalicized, toggleList, toggleMath, updateLink } from './markdownCommands';



export function initCodeMirror(
	parentElement: any, initialText: string, settings: EditorSettings
): CodeMirrorControl {
	logMessage('Initializing CodeMirror...');
	const theme = settings.themeData;

	let schedulePostUndoRedoDepthChangeId_: any = 0;
	const schedulePostUndoRedoDepthChange = (editor: EditorView, doItNow: boolean = false) => {
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
	};

	const notifyDocChanged = (viewUpdate: ViewUpdate) => {
		if (viewUpdate.docChanged) {
			const event: ChangeEvent = {
				value: editor.state.doc.toString(),
			};

			postMessage('onChange', event);
			schedulePostUndoRedoDepthChange(editor);
		}
	};

	const notifySelectionChange = (viewUpdate: ViewUpdate) => {
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
	};

	const notifySelectionFormattingChange = (viewUpdate: ViewUpdate) => {
		if (viewUpdate.docChanged || !viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const oldFormatting = computeSelectionFormatting(viewUpdate.startState);
			const newFormatting = computeSelectionFormatting(viewUpdate.state);

			if (!oldFormatting.eq(newFormatting)) {
				postMessage('onSelectionFormattingChange', newFormatting.toJSON());
			}
		}
	};

	const notifyLinkEditRequest = () => {
		postMessage('onRequestLinkEdit', null);
	};

	const computeSelectionFormatting = (state: EditorState): SelectionFormatting => {
		const range = state.selection.main;
		const formatting: SelectionFormatting = new SelectionFormatting();
		formatting.selectedText = state.doc.sliceString(range.from, range.to);

		const parseLinkData = (nodeText: string) => {
			const linkMatch = nodeText.match(/\[([^\]]*)\]\(([^)]*)\)/);
			return {
				linkText: linkMatch[1],
				linkURL: linkMatch[2],
			};
		};

		// Find nodes that overlap/are within the selected region
		syntaxTree(state).iterate({
			from: range.from, to: range.to,
			enter: node => {
				// Checklists don't have a specific containing node. As such,
				// we're in a checklist if we've selected a 'Task' node.
				if (node.name == 'Task') {
					formatting.inChecklist = true;
				}

				// Only handle notes that contain the entire range.
				if (node.from > range.from || node.to < range.to) {
					return;
				}
				// Lazily compute the node's text
				const nodeText = () => state.doc.sliceString(node.from, node.to);

				switch (node.name) {
				case 'StrongEmphasis':
					formatting.bolded = true;
					break;
				case 'Emphasis':
					formatting.italicized = true;
					break;
				case 'ListItem':
					formatting.listLevel += 1;
					break;
				case 'BulletList':
					formatting.inUnorderedList = true;
					break;
				case 'OrderedList':
					formatting.inOrderedList = true;
					break;
				case 'TaskList':
					formatting.inChecklist = true;
					break;
				case 'InlineCode':
				case 'FencedCode':
					formatting.inCode = true;
					break;
				case 'InlineMath':
				case 'BlockMath':
					formatting.inMath = true;
					break;
				case 'ATXHeading1':
					formatting.headerLevel = 1;
					break;
				case 'ATXHeading2':
					formatting.headerLevel = 2;
					break;
				case 'ATXHeading3':
					formatting.headerLevel = 3;
					break;
				case 'ATXHeading4':
					formatting.headerLevel = 4;
					break;
				case 'ATXHeading5':
					formatting.headerLevel = 5;
					break;
				case 'URL':
					formatting.inLink = true;
					formatting.linkData.linkURL = nodeText();
					break;
				case 'Link':
					formatting.inLink = true;
					formatting.linkData = parseLinkData(nodeText());
					break;
				}
			},
		});

		// The markdown parser marks checklists as unordered lists. Ensure
		// that they aren't marked as such.
		if (formatting.inChecklist) {
			if (!formatting.inUnorderedList) {
				// Even if the selection contains a Task, because an unordered list node
				// must contain a valid Task node, we're only in a checklist if we're also in
				// an unordered list.
				formatting.inChecklist = false;
			} else {
				formatting.inUnorderedList = false;
			}
		}

		return formatting;
	};


	// Returns a keyboard command that returns true (so accepts the keybind)
	const keyCommand = (key: string, run: Command): KeyBinding => {
		return {
			key,
			run,
			preventDefault: true,
		};
	};

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
					notifySelectionFormattingChange(viewUpdate);
				}),
				keymap.of([
					// Markdown formatting keyboard shortcuts
					keyCommand('Mod-b', toggleBolded),
					keyCommand('Mod-i', toggleItalicized),
					keyCommand('Mod-$', toggleMath),
					keyCommand('Mod-`', toggleCode),
					keyCommand('Mod-[', decreaseIndent),
					keyCommand('Mod-]', increaseIndent),
					keyCommand('Mod-k', (_: EditorView) => {
						notifyLinkEditRequest();
						return true;
					}),

					...defaultKeymap, ...historyKeymap, indentWithTab, ...searchKeymap,
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
		scrollSelectionIntoView() {
			editor.dispatch(editor.state.update({
				scrollIntoView: true,
			}));
		},
		insertText(text: string) {
			editor.dispatch(editor.state.replaceSelection(text));
		},
		toggleFindDialog() {
			const opened = openSearchPanel(editor);
			if (!opened) {
				closeSearchPanel(editor);
			}
		},

		// Formatting
		toggleBolded() { toggleBolded(editor); },
		toggleItalicized() { toggleItalicized(editor); },
		toggleCode() { toggleCode(editor); },
		toggleMath() { toggleMath(editor); },
		increaseIndent() { increaseIndent(editor); },
		decreaseIndent() { decreaseIndent(editor); },
		toggleList(kind: ListType) { toggleList(kind)(editor); },
		toggleHeaderLevel(level: number) { toggleHeaderLevel(level)(editor); },
		updateLink(label: string, url: string) { updateLink(label, url)(editor); },
	};

	return editorControls;
}

