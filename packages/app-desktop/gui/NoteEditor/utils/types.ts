import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import { ToolbarButtonInfo, ToolbarItem } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { PluginHtmlContents, PluginStates } from '@joplin/lib/services/plugins/reducer';
import { MarkupLanguage } from '@joplin/renderer';
import { RenderResult, RenderResultPluginAsset } from '@joplin/renderer/types';
import { Dispatch } from 'redux';
import { ProcessResultsRow } from '@joplin/lib/services/search/SearchEngine';
import { DropHandler } from './useDropHandler';
import { SearchMarkers } from './useSearchMarkers';
import { ParseOptions } from '@joplin/lib/HtmlToMd';
import { ScrollStrategy } from '@joplin/editor/CodeMirror/CodeMirrorControl';
import { MarkupToHtmlOptions } from '../../hooks/useMarkupToHtml';
import { ScrollbarSize } from '@joplin/lib/models/settings/builtInMetadata';
import { RefObject, SetStateAction } from 'react';
import * as React from 'react';

export interface AllAssetsOptions {
	contentMaxWidthTarget?: string;
	themeId?: number;
	whiteBackgroundNoteRendering?: boolean;
}

export interface ToolbarButtonInfos {
	[key: string]: ToolbarButtonInfo;
}

export interface NoteEditorProps {
	noteId: string;
	themeId: number;
	dispatch: Dispatch;
	selectedNoteIds: string[];
	selectedFolderId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	notes: any[];
	watchedNoteFiles: string[];
	isProvisional: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	editorNoteStatuses: any;
	notesParentType: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	selectedNoteTags: any[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	lastEditorScrollPercents: any;
	selectedNoteHash: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	searches: any[];
	selectedSearchId: string;
	customCss: string;
	noteVisiblePanes: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	watchedResources: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	highlightedWords: any[];
	tabMovesFocus: boolean;
	plugins: PluginStates;
	toolbarButtonInfos: ToolbarItem[];
	setTagsToolbarButtonInfo: ToolbarButtonInfo;
	contentMaxWidth: number;
	scrollbarSize: ScrollbarSize;
	isSafeMode: boolean;
	useCustomPdfViewer: boolean;
	shareCacheSetting: string;
	syncUserId: string;
	searchResults: ProcessResultsRow[];
	pluginHtmlContents: PluginHtmlContents;
	'plugins.shownEditorViewIds': string[];
	onTitleChange?: (title: string)=> void;
	bodyEditor: string;
	startupPluginsLoaded: boolean;
}

export interface NoteBodyEditorRef {
	content(): string|Promise<string>;
	resetScroll(): void;
	scrollTo(options: ScrollOptions): void;

	supportsCommand(name: string): boolean|Promise<boolean>;
	execCommand(command: CommandValue): Promise<void>;
}

export { MarkupToHtmlOptions };
export type MarkupToHtmlHandler = (markupLanguage: MarkupLanguage, markup: string, options: MarkupToHtmlOptions)=> Promise<RenderResult>;
export type HtmlToMarkdownHandler = (markupLanguage: number, html: string, originalCss: string, parseOptions?: ParseOptions)=> Promise<string>;

export interface NoteBodyEditorProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	style: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	ref: any;
	themeId: number;

	// When this is true it means the note must always be rendered using a white
	// background theme. This applies to the Markdown editor note view, and to
	// the RTE. It does not apply to other elements such as the toolbar, dialogs
	// or the CodeMirror editor. This is used to correctly render HTML notes and
	// avoid cases where black text is rendered over a dark background.
	whiteBackgroundNoteRendering: boolean;

	scrollbarSize: ScrollbarSize;

	content: string;
	contentKey: string;
	contentMarkupLanguage: number;
	contentOriginalCss: string;
	onChange(event: OnChangeEvent): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onWillChange(event: any): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onMessage(event: any): void;
	onScroll(event: { percent: number }): void;
	markupToHtml: MarkupToHtmlHandler;
	htmlToMarkdown: HtmlToMarkdownHandler;
	allAssets: (markupLanguage: MarkupLanguage, options: AllAssetsOptions)=> Promise<RenderResultPluginAsset[]>;
	disabled: boolean;
	dispatch: Dispatch;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	noteToolbar: any;
	setLocalSearchResultCount(count: number): void;
	setLocalSearch(search: string): void;
	setShowLocalSearch(show: boolean): void;
	useLocalSearch: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	searchMarkers: SearchMarkers;
	visiblePanes: string[];
	keyboardMode: string;
	tabMovesFocus: boolean;
	resourceInfos: ResourceInfos;
	resourceDirectory: string;
	locale: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onDrop: DropHandler;
	noteToolbarButtonInfos: ToolbarItem[];
	plugins: PluginStates;
	fontSize: number;
	contentMaxWidth: number;
	isSafeMode: boolean;
	noteId: string;
	useCustomPdfViewer: boolean;
	watchedNoteFiles: string[];
}

export interface FormNote {
	id: string;
	title: string;
	body: string;
	parent_id: string;
	is_todo: number;
	is_conflict?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	bodyEditorContent?: any;
	markup_language: number;
	user_updated_time: number;
	encryption_applied: number;
	deleted_time: number;

	hasChanged: boolean;

	// Getting the content from the editor can be a slow process because that content
	// might need to be serialized first. For that reason, the wrapped editor (eg TinyMCE)
	// first emits onWillChange when there is a change. That event does not include the
	// editor content. After a few milliseconds (eg if the user stops typing for long
	// enough), the editor emits onChange, and that event will include the editor content.
	//
	// Both onWillChange and onChange events include a changeId property which is used
	// to link the two events together. It is used for example to detect if a new note
	// was loaded before the current note was saved - in that case the changeId will be
	// different. The two properties bodyWillChangeId and bodyChangeId are used to save
	// this info with the currently loaded note.
	//
	// The willChange/onChange events also allow us to handle the case where the user
	// types something then quickly switch a different note. In that case, bodyWillChangeId
	// is set, thus we know we should save the note, even though we won't receive the
	// onChange event.
	bodyWillChangeId: number;
	bodyChangeId: number;

	saveActionQueue: AsyncActionQueue;

	// Note with markup_language = HTML have a block of CSS at the start, which is used
	// to preserve the style from the original (web-clipped) page. When sending the note
	// content to TinyMCE, we only send the actual HTML, without this CSS. The CSS is passed
	// via a file in pluginAssets. This is because TinyMCE would not render the style otherwise.
	// However, when we get back the HTML from TinyMCE, we need to reconstruct the original note.
	// Since the CSS used by TinyMCE has been lost (since it's in a temp CSS file), we keep that
	// original CSS here. It's used in formNoteToNote to rebuild the note body.
	// We can keep it here because we know TinyMCE will not modify it anyway.
	originalCss: string;
}

export function defaultFormNote(): FormNote {
	return {
		id: '',
		parent_id: '',
		deleted_time: 0,
		title: '',
		body: '',
		is_todo: 0,
		markup_language: 1,
		bodyWillChangeId: 0,
		bodyChangeId: 0,
		saveActionQueue: null,
		originalCss: '',
		hasChanged: false,
		user_updated_time: 0,
		encryption_applied: 0,
	};
}

export interface ResourceInfo {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	localState: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	item: any;
}

export interface ResourceInfos {
	[index: string]: ResourceInfo;
}

export enum ScrollOptionTypes {
	None = 0,
	Hash = 1,
	Percent = 2,
}

export interface ScrollOptions {
	type: ScrollOptionTypes;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
}

export interface OnChangeEvent {
	changeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	content: any;
}

export interface EditorCommand {
	name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
}

export interface CommandValue {
	name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	args?: any; // Should be an array for CodeMirror or an object for TinyMCE
	ui?: boolean; // For TinyMCE only
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value?: any; // For TinyMCE only
}

type DropCommandBase = {
	pos: {
		clientX: number;
		clientY: number;
	}|undefined;
};

export type DropCommandValue = ({
	type: 'notes';
	markdownTags: string[];
}|{
	type: 'files';
	paths: string[];
	createFileURL: boolean;
}) & DropCommandBase;

export interface ScrollToTextValue {
	// Text should be plain text - it should not include Markdown characters as it needs to work
	// with both TinyMCE and CodeMirror. To specific an element use the `element` property. For
	// example to scroll to `## Scroll to this`, use `{ text: 'Scroll to this', element: 'h2' }`.
	text: string;
	element: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'strong' | 'ul';
	scrollStrategy?: ScrollStrategy;
}

export interface WindowCommandDependencies {
	setShowLocalSearch: React.Dispatch<SetStateAction<boolean>>;
	noteSearchBarRef: RefObject<HTMLInputElement>;
	editorRef: RefObject<NoteBodyEditorRef>;
	titleInputRef: RefObject<HTMLInputElement>;
	containerRef: RefObject<HTMLDivElement|null>;
}
