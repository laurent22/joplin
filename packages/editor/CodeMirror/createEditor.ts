import { MarkdownMathExtension } from './markdownMathParser';
import createTheme from './theme';
import decoratorExtension from './decoratorExtension';

import syntaxHighlightingLanguages from './syntaxHighlightingLanguages';

import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM as GitHubFlavoredMarkdownExtension } from '@lezer/markdown';
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

import { ListType, SearchState, EditorControl, EditorProps } from '../types';
import { EditorEventType, SelectionRangeChangeEvent } from '../events';
import {
	decreaseIndent, increaseIndent,
	toggleBolded, toggleCode,
	toggleHeaderLevel, toggleItalicized,
	toggleList, toggleMath, updateLink,
} from './markdownCommands';
import computeSelectionFormatting from './computeSelectionFormatting';
import { selectionFormattingEqual } from '../SelectionFormatting';


export interface CodeMirrorResult extends EditorControl {
	editor: EditorView;
}

const createEditor = (
	parentElement: HTMLElement, props: EditorProps,
): CodeMirrorResult => {
	const { initialText, settings } = props;
	const theme = settings.themeData;

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

	const notifyDocChanged = (viewUpdate: ViewUpdate) => {
		if (viewUpdate.docChanged) {
			props.onEvent({
				kind: EditorEventType.Change,
				value: editor.state.doc.toString(),
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
		searchVisible = true;
		onSearchDialogUpdate();
	};

	const hideSearchDialog = () => {
		searchVisible = false;
		onSearchDialogUpdate();
	};

	const notifySelectionChange = (viewUpdate: ViewUpdate) => {
		if (!viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const mainRange = viewUpdate.state.selection.main;
			const event: SelectionRangeChangeEvent = {
				kind: EditorEventType.SelectionRangeChange,
				start: mainRange.from,
				end: mainRange.to,
			};
			props.onEvent(event);
		}
	};

	const notifySelectionFormattingChange = (viewUpdate?: ViewUpdate) => {
		const spellcheck = editor.contentDOM.spellcheck;

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

				// By default, indent with tabs to match other
				// editors.
				indentUnit.of('\t'),
				EditorState.tabSize.of(4),

				// Apply styles to entire lines (block-display decorations)
				decoratorExtension,

				EditorView.lineWrapping,
				EditorView.contentAttributes.of({
					autocapitalize: 'sentence',
					autocorrect: settings.spellcheckEnabled ? 'true' : 'false',
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

				EditorState.readOnly.of(settings.readOnly),
			],
			doc: initialText,
		}),
		parent: parentElement,
	});

	// HACK: 09/02/22: Work around https://github.com/laurent22/joplin/issues/6802 by creating a copy mousedown
	//  event to prevent the Editor's .preventDefault from making the context menu not appear.
	// TODO: Track the upstream issue at https://github.com/codemirror/dev/issues/935 and remove this workaround
	//  when the upstream bug is fixed.
	document.body.addEventListener('mousedown', (evt) => {
		if (!evt.isTrusted) {
			return;
		}

		// Walk up the tree -- is evt.target or any of its parent nodes the editor's input region?
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
};

export default createEditor;


