import { EditorView, KeyBinding, keymap } from '@codemirror/view';
import { EditorCommandType, EditorControl, EditorSettings, LogMessageCallback, ContentScriptData, SearchState, UserEventSource, UpdateBodyOptions } from '../types';
import CodeMirror5Emulation from './CodeMirror5Emulation/CodeMirror5Emulation';
import editorCommands from './editorCommands/editorCommands';
import { Compartment, EditorSelection, Extension, StateEffect } from '@codemirror/state';
import { updateLink } from './markdown/markdownCommands';
import { searchPanelOpen, SearchQuery, setSearchQuery } from '@codemirror/search';
import PluginLoader from './pluginApi/PluginLoader';
import customEditorCompletion, { editorCompletionSource, enableLanguageDataAutocomplete } from './pluginApi/customEditorCompletion';
import { CompletionSource } from '@codemirror/autocomplete';
import { RegionSpec } from './utils/formatting/RegionSpec';
import toggleInlineSelectionFormat from './utils/formatting/toggleInlineSelectionFormat';
import getSearchState from './utils/getSearchState';
import { noteIdFacet, setNoteIdEffect } from './utils/selectedNoteIdExtension';

interface Callbacks {
	onUndoRedo(): void;
	onSettingsChange(newSettings: EditorSettings): void;
	onClearHistory(): void;
	onRemove(): void;
	onLogMessage: LogMessageCallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type EditorUserCommand = (...args: any[])=> any;

// Copied from CodeMirror source code since type is not exported
export type ScrollStrategy = 'nearest' | 'start' | 'end' | 'center';

export default class CodeMirrorControl extends CodeMirror5Emulation implements EditorControl {
	private _pluginControl: PluginLoader;
	private _userCommands: Map<string, EditorUserCommand> = new Map();

	public constructor(
		editor: EditorView,
		private _callbacks: Callbacks,
	) {
		super(editor, _callbacks.onLogMessage);

		this._pluginControl = new PluginLoader(this, _callbacks.onLogMessage);

		this.addExtension(customEditorCompletion());
	}

	public supportsCommand(name: string) {
		return name in editorCommands || this._userCommands.has(name) || super.commandExists(name);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override execCommand(name: string, ...args: any[]) {
		let commandOutput;
		if (this._userCommands.has(name)) {
			commandOutput = this._userCommands.get(name)(...args);
		} else if (name in editorCommands) {
			commandOutput = editorCommands[name as EditorCommandType](this.editor, ...args);
		} else if (super.commandExists(name)) {
			commandOutput = super.execCommand(name, ...args);
		} else if (super.supportsJoplinCommand(name)) {
			commandOutput = super.execJoplinCommand(name);
		}

		if (name === EditorCommandType.Undo || name === EditorCommandType.Redo) {
			this._callbacks.onUndoRedo();
		}

		return commandOutput;
	}

	public registerCommand(name: string, command: EditorUserCommand) {
		this._userCommands.set(name, command);
	}

	public undo() {
		this.execCommand(EditorCommandType.Undo);
		this._callbacks.onUndoRedo();
	}

	public redo() {
		this.execCommand(EditorCommandType.Redo);
		this._callbacks.onUndoRedo();
	}

	public select(anchor: number, head: number) {
		this.editor.dispatch(this.editor.state.update({
			selection: { anchor, head },
			scrollIntoView: true,
		}));
	}

	public clearHistory() {
		this._callbacks.onClearHistory();
	}

	public setScrollPercent(fraction: number) {
		const maxScroll = this.editor.scrollDOM.scrollHeight - this.editor.scrollDOM.clientHeight;
		this.editor.scrollDOM.scrollTop = fraction * maxScroll;
	}

	public insertText(text: string, userEvent?: UserEventSource) {
		this.editor.dispatch(this.editor.state.replaceSelection(text), { userEvent });
	}

	public wrapSelections(start: string, end: string) {
		const regionSpec = RegionSpec.of({ template: { start, end } });

		this.editor.dispatch(
			this.editor.state.changeByRange(range => {
				const update = toggleInlineSelectionFormat(this.editor.state, regionSpec, range);
				if (!update.range.empty) {
					// Deselect the start and end characters (roughly preserve the original
					// selection).
					update.range = EditorSelection.range(
						update.range.from + start.length,
						update.range.to - end.length,
					);
				}
				return update;
			}),
		);
	}

	public updateBody(newBody: string, { noteId: newNoteId }: UpdateBodyOptions = {}) {
		const state = this.editor.state;
		const noteIdChanged = newNoteId && newNoteId !== state.facet(noteIdFacet);
		const updateNoteIdEffects = noteIdChanged ? [setNoteIdEffect.of(newNoteId)] : [];

		// TODO: doc.toString() can be slow for large documents.
		const currentBody = state.doc.toString();

		if (newBody !== currentBody) {
			// For now, collapse the selection to a single cursor
			// to ensure that the selection stays within the document
			// (and thus avoids an exception).
			const mainCursorPosition = state.selection.main.anchor;

			// The maximum cursor position needs to be calculated using the EditorState,
			// to correctly account for line endings.
			const maxCursorPosition = state.toText(newBody).length;
			const newCursorPosition = Math.min(mainCursorPosition, maxCursorPosition);

			this.editor.dispatch(state.update({
				changes: {
					from: 0,
					to: state.doc.length,
					insert: newBody,
				},
				selection: EditorSelection.cursor(newCursorPosition),
				scrollIntoView: true,
				effects: [...updateNoteIdEffects],
			}));

			return true;
		} else if (updateNoteIdEffects.length) {
			this.editor.dispatch(state.update({
				effects: updateNoteIdEffects,
			}));

			// Although the note ID field changed, the body is the same:
			return false;
		}

		return false;
	}

	public updateLink(newLabel: string, newUrl: string) {
		updateLink(newLabel, newUrl)(this.editor);
	}

	public updateSettings(newSettings: EditorSettings) {
		this._callbacks.onSettingsChange(newSettings);
	}

	public getSearchState(): SearchState {
		return getSearchState(this.editor.state);
	}

	public setSearchState(newState: SearchState) {
		if (newState.dialogVisible !== searchPanelOpen(this.editor.state)) {
			this.execCommand(newState.dialogVisible ? EditorCommandType.ShowSearch : EditorCommandType.HideSearch);
		}

		const query = new SearchQuery({
			search: newState.searchText,
			caseSensitive: newState.caseSensitive,
			regexp: newState.useRegex,
			replace: newState.replaceText,
		});
		this.editor.dispatch({
			effects: [
				setSearchQuery.of(query),
			],
		});

	}

	public scrollToText(text: string, scrollStrategy: ScrollStrategy) {
		const doc = this.editor.state.doc;
		const index = doc.toString().indexOf(text);
		const textFound = index >= 0;

		if (textFound) {
			this.editor.dispatch({
				effects: EditorView.scrollIntoView(index, { y: scrollStrategy }),
			});
		}

		return textFound;
	}

	public addStyles(...styles: Parameters<typeof EditorView.theme>) {
		const compartment = new Compartment();
		this.editor.dispatch({
			effects: StateEffect.appendConfig.of(
				compartment.of(EditorView.theme(...styles)),
			),
		});

		return {
			remove: () => {
				this.editor.dispatch({
					effects: compartment.reconfigure([]),
				});
			},
		};
	}

	public setContentScripts(plugins: ContentScriptData[]) {
		return this._pluginControl.setPlugins(plugins);
	}

	public remove() {
		this._pluginControl.remove();
		this._callbacks.onRemove();
	}

	//
	// CodeMirror-specific methods
	//

	public prependKeymap(bindings: readonly KeyBinding[]) {
		const compartment = new Compartment();
		this.editor.dispatch({
			effects: StateEffect.appendConfig.of([
				compartment.of(keymap.of(bindings)),
			]),
		});

		return {
			remove: () => {
				this.editor.dispatch({
					effects: compartment.reconfigure([]),
				});
			},
		};
	}

	public joplinExtensions = {
		// Some plugins want to enable autocompletion from *just* that plugin, without also
		// enabling autocompletion for text within code blocks (and other built-in completion
		// sources).
		// To support this, we need to provide extensions that wrap the built-in autocomplete.
		// See https://discuss.codemirror.net/t/autocompletion-merging-override-in-config/7853
		completionSource: (completionSource: CompletionSource) => editorCompletionSource.of(completionSource),
		enableLanguageDataAutocomplete: enableLanguageDataAutocomplete,

		// Allow accessing the current note ID
		noteIdFacet: noteIdFacet.reader,
		// Allows watching the note ID for changes
		setNoteIdEffect,
	};

	public addExtension(extension: Extension) {
		this.editor.dispatch({
			effects: StateEffect.appendConfig.of([extension]),
		});
	}
}
