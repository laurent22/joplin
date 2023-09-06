import { Compartment, EditorState } from '@codemirror/state';
import { indentOnInput, indentUnit } from '@codemirror/language';
import {
	openSearchPanel, closeSearchPanel, getSearchQuery,
	highlightSelectionMatches, search,
} from '@codemirror/search';

import {
	EditorView, drawSelection, highlightSpecialChars, ViewUpdate, Command,
} from '@codemirror/view';
import { history, undoDepth, redoDepth, indentWithTab } from '@codemirror/commands';

import { keymap, KeyBinding } from '@codemirror/view';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap } from '@codemirror/commands';

import { SearchState, EditorProps, EditorSettings } from '../types';
import { EditorEventType, SelectionRangeChangeEvent } from '../events';
import {
	decreaseIndent, increaseIndent,
	toggleBolded, toggleCode,
	toggleItalicized, toggleMath,
} from './markdown/markdownCommands';
import decoratorExtension from './markdown/decoratorExtension';
import computeSelectionFormatting from './markdown/computeSelectionFormatting';
import { selectionFormattingEqual } from '../SelectionFormatting';
import configFromSettings from './configFromSettings';
import getScrollFraction from './getScrollFraction';
import CodeMirrorControl from './CodeMirrorControl';

const createEditor = (
	parentElement: HTMLElement, props: EditorProps,
): CodeMirrorControl => {
	const initialText = props.initialText;
	let settings = props.settings;

	props.onLogMessage('Initializing CodeMirror...');

	let searchVisible = false;

	// Handles firing an event when the undo/redo stack changes
	let schedulePostUndoRedoDepthChangeId_: ReturnType<typeof setTimeout>|null = null;
	let lastUndoDepth = 0;
	let lastRedoDepth = 0;
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
			const newUndoDepth = undoDepth(editor.state);
			const newRedoDepth = redoDepth(editor.state);

			if (newUndoDepth !== lastUndoDepth || newRedoDepth !== lastRedoDepth) {
				props.onEvent({
					kind: EditorEventType.UndoRedoDepthChange,
					undoDepth: newUndoDepth,
					redoDepth: newRedoDepth,
				});
				lastUndoDepth = newUndoDepth;
				lastRedoDepth = newRedoDepth;
			}
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
			run: editor => {
				if (settings.ignoreModifiers) return false;

				return run(editor);
			},
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

					...historyKeymap, indentWithTab, ...searchKeymap,
				]),
			],
			doc: initialText,
		}),
		parent: parentElement,
	});

	const editorControls = new CodeMirrorControl(editor, {
		onSettingsChange: (newSettings: EditorSettings) => {
			settings = newSettings;
			editor.dispatch({
				effects: dynamicConfig.reconfigure(
					configFromSettings(newSettings),
				),
			});
		},
		onUndoRedo: () => {
			// This callback is triggered when undo/redo is called
			// directly. Show visual feedback immediately.
			schedulePostUndoRedoDepthChange(editor, true);
		},
		onLogMessage: props.onLogMessage,
		onRemove: () => {
			editor.destroy();
		},
	});

	return editorControls;
};

export default createEditor;


