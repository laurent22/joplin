import { ListType, SearchControl } from '../types';

// Controls for the CodeMirror portion of the editor
export interface CodeMirrorControl {
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
