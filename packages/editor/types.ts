import type { Theme } from '@joplin/lib/themes/type';
import type { EditorEvent } from './events';

// Controls for just the editor (excluding dialogs that might
// not be provided by the @joplin/editor package).
export interface EditorControl {
	undo(): void;
	redo(): void;
	select(anchor: number, head: number): void;
	insertText(text: string): void;

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

export interface EditorSettings {
	// EditorSettings objects are deserialized within WebViews, where
	// [themeStyle(themeId: number)] doesn't work. As such, we need both
	// a Theme must be provided.
	themeData: Theme;

	katexEnabled: boolean;
	spellcheckEnabled: boolean;
	readOnly: boolean;
}

export interface EditorProps {
	settings: EditorSettings;
	initialText: string;

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
