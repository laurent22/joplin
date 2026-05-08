// Types related to the NoteEditor

import { EditorControl as EditorBodyControl, EditorSettings as EditorBodySettings, SearchState } from '@joplin/editor/types';
import { RefObject } from 'react';
import { WebViewControl } from '../ExtendedWebView/types';
import { SelectionRange } from '../../contentScripts/markdownEditorBundle/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { EditorEvent } from '@joplin/editor/events';
import { ResourceInfos } from '@joplin/renderer/types';

export interface SearchControl {
	findNext(): void;
	findPrevious(): void;
	replaceNext(): void;
	replaceAll(): void;
	showSearch(): void;
	hideSearch(): void;
	setSearchState(state: SearchState): void;
}

// Controls for the entire editor (including dialogs)
export interface EditorControl extends EditorBodyControl {
	showLinkDialog(): void;
	hideLinkDialog(): void;
	hideKeyboard(): void;

	// Additional shortcut commands (equivalent to .execCommand
	// with the corresponding type).
	// This reduces the need for useCallbacks in many cases.
	undo(): void;
	redo(): void;

	increaseIndent(): void;
	decreaseIndent(): void;
	toggleBolded(): void;
	toggleItalicized(): void;
	toggleCode(): void;
	toggleMath(): void;
	toggleOrderedList(): void;
	toggleUnorderedList(): void;
	toggleTaskList(): void;
	toggleHeaderLevel(level: number): void;
	focus(): void;

	scrollSelectionIntoView(): void;
	showLinkDialog(): void;
	hideLinkDialog(): void;
	hideKeyboard(): void;

	searchControl: SearchControl;
}

export type EditorSettings = EditorBodySettings;

type OnAttachCallback = (mime: string, base64: string)=> Promise<void>;
export interface EditorProps {
	noteResources: ResourceInfos;
	editorRef: RefObject<EditorBodyControl>;
	webviewRef: RefObject<WebViewControl>;
	themeId: number;
	noteId: string;
	noteHash: string;
	initialText: string;
	initialSelection: SelectionRange;
	initialScroll: number;
	editorSettings: EditorSettings;
	globalSearch: string;
	plugins: PluginStates;

	onAttach: OnAttachCallback;
	onEditorEvent: (event: EditorEvent)=> void;
}

export enum EditorType {
	Markdown = 'markdown',
	RichText = 'rich-text',
}
