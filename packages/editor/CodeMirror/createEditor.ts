import { Compartment, EditorSelection, EditorState, StateEffect } from '@codemirror/state';
import { indentOnInput, indentUnit } from '@codemirror/language';
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

import { ListType, SearchState, EditorControl, EditorProps, EditorSettings } from '../types';
import { EditorEventType, SelectionRangeChangeEvent } from '../events';
import {
	decreaseIndent, increaseIndent,
	toggleBolded, toggleCode,
	toggleHeaderLevel, toggleItalicized,
	toggleList, toggleMath, updateLink,
} from './markdown/markdownCommands';
import decoratorExtension from './markdown/decoratorExtension';
import computeSelectionFormatting from './markdown/computeSelectionFormatting';
import { selectionFormattingEqual } from '../SelectionFormatting';
import configFromSettings from './configFromSettings';

interface ScrollInfo {
	height: number;
	clientHeight: number;
}

export interface CodeMirrorControl extends EditorControl {
	editor: EditorView;
	addStyles(...style: Parameters<typeof EditorView.theme>): void;

	// Getters to emulate CodeMirror 5
	somethingSelected(): boolean;
	getSelection(): string;
	listSelections(): readonly { anchor: number; head: number }[];

	getScrollInfo(): ScrollInfo;
	getScrollPercent(): number;
	lineCount(): number;
	lineAtHeight(height: number, mode?: 'local'): number;
	heightAtLine(lineNumber: number, mode?: 'local'): number;

}

const createEditor = (
	parentElement: HTMLElement, props: EditorProps,
): CodeMirrorControl => {
	const initialText = props.initialText;
	let settings = props.settings;

	// TODO: Use props.plugins

	props.onLogMessage('Initializing CodeMirror...');

	let searchVisible = false;

	// Handles firing an event when the undo/redo stack changes
	let schedulePostUndoRedoDepthChangeId_: ReturnType<typeof setTimeout>|null = null;
	const schedulePostUndoRedoDepthChange = (editor: EditorView, doItNow = false) => {
		if (schedulePostUndoRedoDepthChangeId_ !== null) {
			if (doItNow) {
				clearTimeout(schedulePostUndoRedoDepthChangeId_);
			} else {
				return;
			}
		}

		schedulePostUndoRedoDepthChangeId_ = setTimeout(() => {
			schedulePostUndoRedoDepthChangeId_ = null;
			props.onEvent({
				kind: EditorEventType.UndoRedoDepthChange,
				undoDepth: undoDepth(editor.state),
				redoDepth: redoDepth(editor.state),
			});
		}, doItNow ? 0 : 1000);
	};

	let currentDocText = props.initialText;
	const notifyDocChanged = (viewUpdate: ViewUpdate) => {
		if (viewUpdate.docChanged) {
			currentDocText = editor.state.doc.toString();
			props.onEvent({
				kind: EditorEventType.Change,
				value: currentDocText,
			});

			schedulePostUndoRedoDepthChange(editor);
		}
	};

	const notifyLinkEditRequest = () => {
		props.onEvent({
			kind: EditorEventType.EditLink,
		});
	};

	const onSearchDialogUpdate = () => {
		const query = getSearchQuery(editor.state);
		const searchState: SearchState = {
			searchText: query.search,
			replaceText: query.replace,
			useRegex: query.regexp,
			caseSensitive: query.caseSensitive,
			dialogVisible: searchVisible,
		};
		props.onEvent({
			kind: EditorEventType.UpdateSearchDialog,
			searchState,
		});
	};

	const showSearchDialog = () => {
		if (!searchVisible) {
			openSearchPanel(editor);
		}
		searchVisible = true;
		onSearchDialogUpdate();
	};

	const hideSearchDialog = () => {
		if (searchVisible) {
			closeSearchPanel(editor);
		}
		searchVisible = false;
		onSearchDialogUpdate();
	};

	const globalSpellcheckEnabled = () => {
		return editor.contentDOM.spellcheck;
	};

	const getScrollFraction = (view: EditorView) => {
		const maxScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;

		// Prevent division by zero
		return maxScroll > 0 ? view.scrollDOM.scrollTop / maxScroll : 0;
	};

	const notifySelectionChange = (viewUpdate: ViewUpdate) => {
		if (!viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const mainRange = viewUpdate.state.selection.main;
			const event: SelectionRangeChangeEvent = {
				kind: EditorEventType.SelectionRangeChange,

				anchor: mainRange.anchor,
				head: mainRange.head,
				from: mainRange.from,
				to: mainRange.to,
			};
			props.onEvent(event);
		}
	};

	const notifySelectionFormattingChange = (viewUpdate?: ViewUpdate) => {
		const spellcheck = globalSpellcheckEnabled();

		// If we can't determine the previous formatting, post the update regardless
		if (!viewUpdate) {
			const formatting = computeSelectionFormatting(editor.state, spellcheck);
			props.onEvent({
				kind: EditorEventType.SelectionFormattingChange,
				formatting,
			});
		} else if (viewUpdate.docChanged || !viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {

			// Only post the update if something changed
			const oldFormatting = computeSelectionFormatting(viewUpdate.startState, spellcheck);
			const newFormatting = computeSelectionFormatting(viewUpdate.state, spellcheck);

			if (!selectionFormattingEqual(oldFormatting, newFormatting)) {
				props.onEvent({
					kind: EditorEventType.SelectionFormattingChange,
					formatting: newFormatting,
				});
			}
		}
	};

	// Returns a keyboard command that returns true (so accepts the keybind)
	const keyCommand = (key: string, run: Command): KeyBinding => {
		return {
			key,
			run,
			preventDefault: true,
		};
	};

	const dynamicConfig = new Compartment();

	const editor = new EditorView({
		state: EditorState.create({
			// See https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
			// for a sample configuration.
			extensions: [
				dynamicConfig.of([
					configFromSettings(props.settings),
				]),
				history(),
				search(settings.useExternalSearch ? {
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
				} : undefined),
				drawSelection(),
				highlightSpecialChars(),
				highlightSelectionMatches(),
				indentOnInput(),

				EditorView.domEventHandlers({
					scroll: (_event, view) => {
						props.onEvent({
							kind: EditorEventType.Scroll,
							fraction: getScrollFraction(view),
						});
					},
				}),

				// TODO: indent with tabs to match other
				// editors.
				// Tab indentation has list-related bugs. See
				// https://github.com/codemirror/dev/issues/1243
				indentUnit.of('    '),
				EditorState.tabSize.of(4),

				// Apply styles to entire lines (block-display decorations)
				decoratorExtension,

				EditorView.lineWrapping,
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

	const editorControls: CodeMirrorControl = {
		undo: () => {
			undo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		redo: () => {
			redo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		focus: () => {
			editor.focus();
		},
		selectAll: () => {
			editor.dispatch(editor.state.update({
				selection: { anchor: 0, head: editor.state.doc.length },
				scrollIntoView: true,
			}));
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
		setScrollPercent: (fraction: number) => {
			const maxScroll = editor.scrollDOM.scrollHeight - editor.scrollDOM.clientHeight;
			editor.scrollDOM.scrollTop = fraction * maxScroll;
		},
		insertText: (text: string) => {
			editor.dispatch(editor.state.replaceSelection(text));
		},
		updateBody: (newBody: string) => {
			if (newBody !== currentDocText) {
				// For now, collapse the selection to a single cursor
				// to ensure that the selection stays within the document
				// (and thus avoids an exception).
				const mainCursorPosition = editor.state.selection.main.anchor;
				const newCursorPosition = Math.min(mainCursorPosition, newBody.length);

				editor.dispatch(editor.state.update({
					changes: {
						from: 0,
						to: editor.state.doc.length,
						insert: newBody,
					},
					selection: EditorSelection.cursor(newCursorPosition),
					scrollIntoView: true,
				}));
			}
		},

		updateSettings: (newSettings: EditorSettings) => {
			settings = newSettings;
			editor.dispatch({
				effects: dynamicConfig.reconfigure(
					configFromSettings(newSettings),
				),
			});
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


		// CodeMirror-specific options
		editor,
		addStyles: styles => {
			editor.dispatch({
				effects: StateEffect.appendConfig.of(EditorView.theme(styles)),
			});
		},

		// CM5 emulation
		lineCount: () => {
			return editor.state.doc.lines;
		},
		lineAtHeight: (height, _mode) => {
			const lineInfo = editor.lineBlockAtHeight(height);

			// - 1: Convert to zero-based.
			const lineNumber = editor.state.doc.lineAt(lineInfo.to).number - 1;
			return lineNumber;
		},
		heightAtLine: (lineNumber, mode) => {
			// CodeMirror 5 uses 0-based line numbers. CM6 uses 1-based
			// line numbers.
			const doc = editor.state.doc;
			const lineInfo = doc.line(Math.min(lineNumber + 1, doc.lines));
			const lineBlock = editor.lineBlockAt(lineInfo.from);

			const height = lineBlock.top;
			if (mode === 'local') {
				const editorTop = editor.lineBlockAt(0).top;
				return height - editorTop;
			} else {
				return height;
			}
		},
		getScrollInfo: () => {
			return {
				height: editor.scrollDOM.scrollHeight,
				clientHeight: editor.scrollDOM.clientHeight,
			};
		},
		getScrollPercent: () => {
			return getScrollFraction(editor);
		},

		getSelection: (): string => {
			const mainRange = editor.state.selection.main;
			return editor.state.sliceDoc(mainRange.from, mainRange.to);
		},
		somethingSelected: () => {
			return !editor.state.selection.main.empty;
		},
		listSelections: () => {
			return editor.state.selection.ranges;
		},
	};

	return editorControls;
};

export default createEditor;


