import type { Theme } from '@joplin/lib/themes/type';
import type { EditorEvent } from './events';

// Editor commands. For compatibility, the string values of these commands
// should correspond with the CodeMirror 5 commands:
// https://codemirror.net/5/doc/manual.html#commands
export enum EditorCommandType {
	Undo = 'undo',
	Redo = 'redo',
	SelectAll = 'selectAll',
	Focus = 'focus',

	// Formatting editor commands
	ToggleBolded = 'textBold',
	ToggleItalicized = 'textItalic',
	ToggleCode = 'textCode',
	ToggleMath = 'textMath',
	ToggleComment = 'toggleComment',
	DuplicateLine = 'duplicateLine',
	SortSelectedLines = 'sortSelectedLines',

	ToggleNumberedList = 'textNumberedList',
	ToggleBulletedList = 'textBulletedList',
	ToggleCheckList = 'textCheckbox',

	ToggleHeading = 'textHeading',
	ToggleHeading1 = 'textHeading1',
	ToggleHeading2 = 'textHeading2',
	ToggleHeading3 = 'textHeading3',
	ToggleHeading4 = 'textHeading4',
	ToggleHeading5 = 'textHeading5',

	// Find commands
	ShowSearch = 'find',
	HideSearch = 'hideSearchDialog',
	FindNext = 'findNext',
	FindPrevious = 'findPrev',
	ReplaceNext = 'replace',
	ReplaceAll = 'replaceAll',

	// Editing and navigation commands
	ScrollSelectionIntoView = 'scrollSelectionIntoView',
	DeleteLine = 'deleteLine',
	DeleteToLineEnd = 'killLine',
	DeleteToLineStart = 'delLineLeft',
	IndentMore = 'indentMore',
	IndentLess = 'indentLess',
	IndentAuto = 'indentAuto',
	InsertNewlineAndIndent = 'newlineAndIndent',

	SwapLineUp = 'swapLineUp',
	SwapLineDown = 'swapLineDown',

	GoDocEnd = 'goDocEnd',
	GoDocStart = 'goDocStart',
	GoLineStart = 'goLineStart',
	GoLineEnd = 'goLineEnd',
	GoLineUp = 'goLineUp',
	GoLineDown = 'goLineDown',
	GoPageUp = 'goPageUp',
	GoPageDown = 'goPageDown',
	GoCharLeft = 'goCharLeft',
	GoCharRight = 'goCharRight',

	UndoSelection = 'undoSelection',
	RedoSelection = 'redoSelection',

	// Getters and multi-argument commands. These correspond to global Joplin
	// commands.
	SelectedText = 'selectedText',
	InsertText = 'insertText',
	ReplaceSelection = 'replaceSelection',

	SetText = 'setText',
}

// Because the editor package can run in a WebView, plugin content scripts
// need to be provided as text, rather than as file paths.
export interface ContentScriptData {
	pluginId: string;
	contentScriptId: string;
	contentScriptJs: ()=> Promise<string>;
	loadCssAsset: (name: string)=> Promise<string>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	postMessageHandler: (message: any)=> any;
}

// Intended to correspond with https://codemirror.net/docs/ref/#state.Transaction%5EuserEvent
export enum UserEventSource {
	Paste = 'input.paste',
}

export interface EditorControl {
	supportsCommand(name: EditorCommandType|string): boolean|Promise<boolean>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	execCommand(name: EditorCommandType|string, ...args: any[]): void|Promise<any>;

	undo(): void;
	redo(): void;

	select(anchor: number, head: number): void;

	// 0 corresponds to the top, 1 corresponds to the bottom.
	setScrollPercent(fraction: number): void;

	insertText(text: string, source?: UserEventSource): void;
	updateBody(newBody: string): void;

	updateSettings(newSettings: EditorSettings): void;

	// Create a new link or update the currently selected link with
	// the given [label] and [url].
	updateLink(label: string, url: string): void;

	setSearchState(state: SearchState): void;

	setContentScripts(plugins: ContentScriptData[]): Promise<void>;
}

export enum EditorLanguageType {
	Markdown = 'markdown',
	Html = 'html',
}

export enum EditorKeymap {
	Default = 'default',
	Vim = 'vim',
	Emacs = 'emacs',
}

export interface EditorTheme extends Theme {
	fontFamily: string;
	fontSize?: number;
	fontSizeUnits?: string;
	isDesktop?: boolean;
	monospaceFont?: string;
	contentMaxWidth?: number;
	marginLeft?: number;
	marginRight?: number;
}

export interface EditorSettings {
	// EditorSettings objects are deserialized within WebViews, where
	// [themeStyle(themeId: number)] doesn't work. As such, we need both
	// a Theme must be provided.
	themeData: EditorTheme;

	// True if the search panel is implemented outside of the editor (e.g. with
	// React Native).
	useExternalSearch: boolean;

	automatchBraces: boolean;

	// True if internal command keyboard shortcuts should be ignored (thus
	// allowing Joplin shortcuts to run).
	ignoreModifiers: boolean;

	language: EditorLanguageType;

	keymap: EditorKeymap;

	katexEnabled: boolean;
	spellcheckEnabled: boolean;
	readOnly: boolean;

	indentWithTabs: boolean;
}

export type LogMessageCallback = (message: string)=> void;
export type OnEventCallback = (event: EditorEvent)=> void;

export interface EditorProps {
	settings: EditorSettings;
	initialText: string;

	onEvent: OnEventCallback;
	onLogMessage: LogMessageCallback;
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
