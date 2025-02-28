import { Compartment, EditorState, Prec } from '@codemirror/state';
import { indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { openSearchPanel, closeSearchPanel, searchPanelOpen } from '@codemirror/search';

import { classHighlighter } from '@lezer/highlight';

import {
	EditorView, drawSelection, highlightSpecialChars, ViewUpdate, Command, rectangularSelection,
	dropCursor,
} from '@codemirror/view';
import { history, undoDepth, redoDepth, standardKeymap, insertTab } from '@codemirror/commands';

import { keymap, KeyBinding } from '@codemirror/view';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap } from '@codemirror/commands';

import { EditorProps, EditorSettings } from '../types';
import { EditorEventType, SelectionRangeChangeEvent } from '../events';
import {
	decreaseIndent, increaseIndent,
	insertOrIncreaseIndent,
	toggleBolded, toggleCode,
	toggleItalicized, toggleMath,
} from './markdown/markdownCommands';
import decoratorExtension from './markdown/decoratorExtension';
import computeSelectionFormatting from './markdown/computeSelectionFormatting';
import { selectionFormattingEqual } from '../SelectionFormatting';
import configFromSettings from './configFromSettings';
import getScrollFraction from './getScrollFraction';
import CodeMirrorControl from './CodeMirrorControl';
import insertLineAfter from './editorCommands/insertLineAfter';
import handlePasteEvent from './utils/handlePasteEvent';
import biDirectionalTextExtension from './utils/biDirectionalTextExtension';
import searchExtension from './utils/searchExtension';
import isCursorAtBeginning from './utils/isCursorAtBeginning';
import overwriteModeExtension from './utils/overwriteModeExtension';
import handleLinkEditRequests, { showLinkEditor } from './utils/handleLinkEditRequests';
import selectedNoteIdExtension, { setNoteIdEffect } from './utils/selectedNoteIdExtension';

// Newer versions of CodeMirror by default use Chrome's EditContext API.
// While this might be stable enough for desktop use, it causes significant
// problems on Android:
// - https://github.com/codemirror/dev/issues/1450
// - https://github.com/codemirror/dev/issues/1451
// For now, CodeMirror allows disabling EditContext to work around these issues:
// https://discuss.codemirror.net/t/experimental-support-for-editcontext/8144/3
type ExtendedEditorView = typeof EditorView & { EDIT_CONTEXT: boolean };
(EditorView as ExtendedEditorView).EDIT_CONTEXT = false;

const createEditor = (
	parentElement: HTMLElement, props: EditorProps,
): CodeMirrorControl => {
	const initialText = props.initialText;
	let settings = props.settings;

	props.onLogMessage('Initializing CodeMirror...');


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
	// alwaysActive: true if this command should be registered even if ignoreModifiers is given.
	const keyCommand = (key: string, run: Command, alwaysActive?: boolean): KeyBinding => {
		return {
			key,
			run: editor => {
				if (settings.ignoreModifiers && !alwaysActive) return false;

				return run(editor);
			},
		};
	};

	const historyCompartment = new Compartment();
	const dynamicConfig = new Compartment();

	// Give the default keymap low precedence so that it is overridden
	// by extensions with default precedence.
	const keymapConfig = Prec.low(keymap.of([
		// Custom mod-f binding: Toggle the external dialog implementation
		// (don't show/hide the Panel dialog).
		keyCommand('Mod-f', (editor: EditorView) => {
			if (searchPanelOpen(editor.state)) {
				closeSearchPanel(editor);
			} else {
				openSearchPanel(editor);
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
		keyCommand('Mod-k', showLinkEditor),
		keyCommand('Tab', (view: EditorView) => {
			if (settings.tabMovesFocus) {
				return false;
			}

			if (settings.autocompleteMarkup) {
				return insertOrIncreaseIndent(view);
			}
			// Use the default indent behavior (which doesn't adjust markup)
			return insertTab(view);
		}, true),
		keyCommand('Shift-Tab', (view) => {
			if (settings.tabMovesFocus) {
				return false;
			}

			// When at the beginning of the editor, allow shift-tab to act
			// normally.
			if (isCursorAtBeginning(view.state)) {
				return false;
			}

			return decreaseIndent(view);
		}, true),
		keyCommand('Mod-Enter', (_: EditorView) => {
			insertLineAfter(_);
			return true;
		}, true),

		keyCommand('ArrowUp', (view: EditorView) => {
			if (isCursorAtBeginning(view.state) && props.onSelectPastBeginning) {
				props.onSelectPastBeginning();
				return true;
			}
			return false;
		}, true),

		...standardKeymap, ...historyKeymap, ...searchKeymap,
	]));

	const editor = new EditorView({
		state: EditorState.create({
			// See https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
			// for a sample configuration.
			extensions: [
				keymapConfig,

				dynamicConfig.of(configFromSettings(props.settings)),
				historyCompartment.of(history()),
				searchExtension(props.onEvent, props.settings),

				// Allows multiple selections and allows selecting a rectangle
				// with ctrl (as in CodeMirror 5)
				EditorState.allowMultipleSelections.of(true),
				rectangularSelection(),
				drawSelection(),

				highlightSpecialChars(),
				indentOnInput(),

				EditorView.domEventHandlers({
					scroll: (_event, view) => {
						props.onEvent({
							kind: EditorEventType.Scroll,
							fraction: getScrollFraction(view),
						});
					},
					paste: (event, view) => {
						if (props.onPasteFile) {
							handlePasteEvent(event, view, props.onPasteFile);
						}
					},
					dragover: (event, _view) => {
						if (props.onPasteFile && event.dataTransfer.files.length) {
							event.preventDefault();
							event.dataTransfer.dropEffect = 'copy';
							return true;
						}
						return false;
					},
					drop: (event, view) => {
						if (props.onPasteFile) {
							handlePasteEvent(event, view, props.onPasteFile);
						}
					},
				}),

				EditorState.tabSize.of(4),

				// Apply styles to entire lines (block-display decorations)
				decoratorExtension,
				dropCursor(),

				biDirectionalTextExtension,
				overwriteModeExtension,

				selectedNoteIdExtension,

				props.localisations ? EditorState.phrases.of(props.localisations) : [],

				// Adds additional CSS classes to tokens (the default CSS classes are
				// auto-generated and thus unstable).
				syntaxHighlighting(classHighlighter),

				EditorView.lineWrapping,
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					notifyDocChanged(viewUpdate);
					notifySelectionChange(viewUpdate);
					notifySelectionFormattingChange(viewUpdate);
				}),

				handleLinkEditRequests(() => {
					props.onEvent({
						kind: EditorEventType.EditLink,
					});
				}),
			],
			doc: initialText,
		}),
		parent: parentElement,
	});

	editor.dispatch(editor.state.update({
		effects: setNoteIdEffect.of(props.initialNoteId),
	}));

	const editorControls = new CodeMirrorControl(editor, {
		onClearHistory: () => {
			// Clear history by removing then re-add the history extension.
			// Just re-adding the history extension isn't enough.
			editor.dispatch({
				effects: historyCompartment.reconfigure([]),
			});
			editor.dispatch({
				effects: historyCompartment.reconfigure(history()),
			});
		},
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


