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
import createTheme from './theme';
import decoratorExtension from './decoratorExtension';

import syntaxHighlightingLanguages from './syntaxHighlightingLanguages';

import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM as GitHubFlavoredMarkdownExtension } from '@lezer/markdown';
import { indentOnInput, indentUnit, syntaxTree } from '@codemirror/language';
import {
	openSearchPanel, closeSearchPanel, SearchQuery, setSearchQuery, getSearchQuery,
	highlightSelectionMatches, search, findNext, findPrevious, replaceAll, replaceNext,
} from '@codemirror/search';

import {
	EditorView, drawSelection, highlightSpecialChars, ViewUpdate, Command,
} from '@codemirror/view';
import { undo, redo, history, undoDepth, redoDepth, indentWithTab } from '@codemirror/commands';

import { keymap, KeyBinding } from '@codemirror/view';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap, defaultKeymap } from '@codemirror/commands';

import { CodeMirrorControl } from './types';
import { EditorSettings, ListType, SearchState } from '../types';
import { ChangeEvent, SelectionChangeEvent, Selection } from '../types';
import SelectionFormatting from '../SelectionFormatting';
import { logMessage, postMessage } from './webviewLogger';
import {
	decreaseIndent, increaseIndent,
	toggleBolded, toggleCode,
	toggleHeaderLevel, toggleItalicized,
	toggleList, toggleMath, updateLink,
} from './markdownCommands';

export function initCodeMirror(
	parentElement: any, initialText: string, settings: EditorSettings
): CodeMirrorControl {
	logMessage('Initializing CodeMirror...');
	const theme = settings.themeData;

	let searchVisible = false;

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

	const notifyLinkEditRequest = () => {
		postMessage('onRequestLinkEdit', null);
	};

	const showSearchDialog = () => {
		const query = getSearchQuery(editor.state);
		const searchState: SearchState = {
			searchText: query.search,
			replaceText: query.replace,
			useRegex: query.regexp,
			caseSensitive: query.caseSensitive,
			dialogVisible: true,
		};

		postMessage('onRequestShowSearch', searchState);
		searchVisible = true;
	};

	const hideSearchDialog = () => {
		postMessage('onRequestHideSearch', null);
		searchVisible = false;
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

	const notifySelectionFormattingChange = (viewUpdate?: ViewUpdate) => {
		// If we can't determine the previous formatting, post the update regardless
		if (!viewUpdate) {
			const formatting = computeSelectionFormatting(editor.state);
			postMessage('onSelectionFormattingChange', formatting.toJSON());
		} else if (viewUpdate.docChanged || !viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			// Only post the update if something changed
			const oldFormatting = computeSelectionFormatting(viewUpdate.startState);
			const newFormatting = computeSelectionFormatting(viewUpdate.state);

			if (!oldFormatting.eq(newFormatting)) {
				postMessage('onSelectionFormattingChange', newFormatting.toJSON());
			}
		}
	};

	const computeSelectionFormatting = (state: EditorState): SelectionFormatting => {
		const range = state.selection.main;
		const formatting: SelectionFormatting = new SelectionFormatting();
		formatting.selectedText = state.doc.sliceString(range.from, range.to);
		formatting.spellChecking = editor.contentDOM.spellcheck;

		const parseLinkData = (nodeText: string) => {
			const linkMatch = nodeText.match(/\[([^\]]*)\]\(([^)]*)\)/);

			if (linkMatch) {
				return {
					linkText: linkMatch[1],
					linkURL: linkMatch[2],
				};
			}

			return null;
		};

		// Find nodes that overlap/are within the selected region
		syntaxTree(state).iterate({
			from: range.from, to: range.to,
			enter: node => {
				// Checklists don't have a specific containing node. As such,
				// we're in a checklist if we've selected a 'Task' node.
				if (node.name === 'Task') {
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
					formatting.unspellCheckableRegion = true;
					break;
				case 'InlineMath':
				case 'BlockMath':
					formatting.inMath = true;
					formatting.unspellCheckableRegion = true;
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
					formatting.unspellCheckableRegion = true;
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

		if (formatting.unspellCheckableRegion) {
			formatting.spellChecking = false;
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
						GitHubFlavoredMarkdownExtension,

						// Don't highlight KaTeX if the user disabled it
						settings.katexEnabled ? MarkdownMathExtension : [],
					],
					codeLanguages: syntaxHighlightingLanguages,
				}),
				...createTheme(theme),
				history(),
				search({
					createPanel(_: EditorView) {
						return {
							// The actual search dialog is implemented with react native,
							// use a dummy element.
							dom: document.createElement('div'),
							mount() {
								showSearchDialog();
							},
							destroy() {
								hideSearchDialog();
							},
						};
					},
				}),
				drawSelection(),
				highlightSpecialChars(),
				highlightSelectionMatches(),
				indentOnInput(),

				// By default, indent with four spaces
				indentUnit.of('    '),
				EditorState.tabSize.of(4),

				// Apply styles to entire lines (block-display decorations)
				decoratorExtension,

				EditorView.lineWrapping,
				EditorView.contentAttributes.of({
					autocapitalize: 'sentence',
					spellcheck: settings.spellcheckEnabled ? 'true' : 'false',
				}),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					notifyDocChanged(viewUpdate);
					notifySelectionChange(viewUpdate);
					notifySelectionFormattingChange(viewUpdate);
				}),
				keymap.of([
					// Custom mod-f binding: Toggle the external dialog implementation
					// (don't show/hide the Panel dialog).
					keyCommand('Mod-f', (_: EditorView) => {
						if (searchVisible) {
							hideSearchDialog();
						} else {
							showSearchDialog();
						}
						return true;
					}),
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

	// HACK: 09/02/22: Work around https://github.com/laurent22/joplin/issues/6802 by creating a copy mousedown
	//  event to stop the Editor from calling .preventDefault on the mouse event.
	document.body.addEventListener('mousedown', (evt) => {
		if (!evt.isTrusted) {
			return;
		}

		for (let current: Record<string, any> = evt.target; current; current = current.parentElement) {
			if (current === editor.contentDOM) {
				evt.stopPropagation();

				const copyEvent = new Event('mousedown', evt);
				editor.contentDOM.dispatchEvent(copyEvent);
				return;
			}
		}
	}, true);

	const updateSearchQuery = (newState: SearchState) => {
		const query = new SearchQuery({
			search: newState.searchText,
			caseSensitive: newState.caseSensitive,
			regexp: newState.useRegex,
			replace: newState.replaceText,
		});
		editor.dispatch({
			effects: setSearchQuery.of(query),
		});
	};

	const editorControls = {
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
		scrollSelectionIntoView: () => {
			editor.dispatch(editor.state.update({
				scrollIntoView: true,
			}));
		},
		insertText: (text: string) => {
			editor.dispatch(editor.state.replaceSelection(text));
		},
		toggleFindDialog: () => {
			const opened = openSearchPanel(editor);
			if (!opened) {
				closeSearchPanel(editor);
			}
		},

		// Formatting
		toggleBolded: () => { toggleBolded(editor); },
		toggleItalicized: () => { toggleItalicized(editor); },
		toggleCode: () => { toggleCode(editor); },
		toggleMath: () => { toggleMath(editor); },
		increaseIndent: () => { increaseIndent(editor); },
		decreaseIndent: () => { decreaseIndent(editor); },
		toggleList: (kind: ListType) => { toggleList(kind)(editor); },
		toggleHeaderLevel: (level: number) => { toggleHeaderLevel(level)(editor); },
		updateLink: (label: string, url: string) => { updateLink(label, url)(editor); },

		// Search
		searchControl: {
			findNext: () => {
				findNext(editor);
			},
			findPrevious: () => {
				findPrevious(editor);
			},
			replaceCurrent: () => {
				replaceNext(editor);
			},
			replaceAll: () => {
				replaceAll(editor);
			},
			setSearchState: (state: SearchState) => {
				updateSearchQuery(state);
			},
			showSearch: () => {
				showSearchDialog();
			},
			hideSearch: () => {
				hideSearchDialog();
			},
		},
	};

	return editorControls;
}

