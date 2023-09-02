import type { Theme } from '@joplin/lib/themes/type';
import type { EditorEvent } from './events';
import type { PluginStates } from '@joplin/lib/services/plugins/reducer';

// Controls for just the editor (excluding dialogs that might
// not be provided by the @joplin/editor package).
export interface EditorControl {
	undo(): void;
	redo(): void;
	select(anchor: number, head: number): void;
	selectAll(): void;
	focus(): void;

	// 0 corresponds to the top, 1 corresponds to the bottom.
	setScrollPercent(fraction: number): void;

	insertText(text: string): void;
	updateBody(newBody: string): void;

	updateSettings(newSettings: EditorSettings): void;

	// Toggle whether we're in a type of region.
	toggleBolded(): void;
	toggleItalicized(): void;
	toggleList(kind: ListType): void;
	toggleCode(): void;
	toggleMath(): void;
	toggleHeaderLevel(level: number): void;

	// Create a new link or update the currently selected link with
	// the given [label] and [url].
	updateLink(label: string, url: string): void;

	increaseIndent(): void;
	decreaseIndent(): void;
	scrollSelectionIntoView(): void;

	searchControl: SearchControl;
}

export enum EditorLanguageType {
	Markdown,
	Html,
}

export interface EditorSettings {
	// EditorSettings objects are deserialized within WebViews, where
	// [themeStyle(themeId: number)] doesn't work. As such, we need both
	// a Theme must be provided.
	themeData: Theme;

	// True if the search panel is implemented outside of the editor (e.g. with
	// React Native).
	useExternalSearch: boolean;

	automatchBraces: boolean;

	// True if internal command keyboard shortcuts should be ignored (thus
	// allowing Joplin shortcuts to run).
	ignoreModifiers: boolean;

	language: EditorLanguageType;

	katexEnabled: boolean;
	spellcheckEnabled: boolean;
	readOnly: boolean;
}

export interface EditorProps {
	settings: EditorSettings;
	initialText: string;
	plugins: PluginStates;

	onEvent(event: EditorEvent): void;
	onLogMessage: (message: string)=> void;
}

export interface SearchControl {
	findNext(): void;
	findPrevious(): void;
	replaceCurrent(): void;
	replaceAll(): void;
	setSearchState(state: SearchState): void;

	showSearch(): void;
	hideSearch(): void;
}

export interface SearchState {
	useRegex: boolean;
	caseSensitive: boolean;

	searchText: string;
	replaceText: string;
	dialogVisible: boolean;
}

// Possible types of lists in the editor
export enum ListType {
	CheckList,
	OrderedList,
	UnorderedList,
}
