// eslint-disable-next-line no-unused-vars
import AsyncActionQueue from '../../../lib/AsyncActionQueue';

export interface NoteEditorProps {
	style: any;
	noteId: string;
	theme: number;
	dispatch: Function;
	selectedNoteIds: string[];
	notes: any[];
	watchedNoteFiles: string[];
	isProvisional: boolean;
	editorNoteStatuses: any;
	syncStarted: boolean;
	bodyEditor: string;
	folders: any[];
	notesParentType: string;
	selectedNoteTags: any[];
	lastEditorScrollPercents: any;
	selectedNoteHash: string;
	searches: any[],
	selectedSearchId: string,
	customCss: string,
	noteVisiblePanes: string[],
	watchedResources: any,
}

export interface NoteBodyEditorProps {
	style: any;
	ref: any,
	theme: number;
	content: string,
	contentKey: string,
	contentMarkupLanguage: number,
	contentOriginalCss: string,
	onChange(event: OnChangeEvent): void;
	onWillChange(event: any): void;
	onMessage(event: any): void;
	onScroll(event: any): void;
	markupToHtml: Function;
	htmlToMarkdown: Function;
	allAssets: Function;
	disabled: boolean;
	dispatch: Function;
	noteToolbar: any;
	setLocalSearchResultCount(count: number): void,
	searchMarkers: any,
	visiblePanes: string[],
	keyboardMode: string,
	resourceInfos: ResourceInfos,
	locale: string,
	onDrop: Function,
}

export interface FormNote {
	id: string,
	title: string,
	body: string,
	parent_id: string,
	is_todo: number,
	bodyEditorContent?: any,
	markup_language: number,
	user_updated_time: number,
	encryption_applied: number,

	hasChanged: boolean,

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
	bodyWillChangeId: number
	bodyChangeId: number,

	saveActionQueue: AsyncActionQueue,

	// Note with markup_language = HTML have a block of CSS at the start, which is used
	// to preserve the style from the original (web-clipped) page. When sending the note
	// content to TinyMCE, we only send the actual HTML, without this CSS. The CSS is passed
	// via a file in pluginAssets. This is because TinyMCE would not render the style otherwise.
	// However, when we get back the HTML from TinyMCE, we need to reconstruct the original note.
	// Since the CSS used by TinyMCE has been lost (since it's in a temp CSS file), we keep that
	// original CSS here. It's used in formNoteToNote to rebuild the note body.
	// We can keep it here because we know TinyMCE will not modify it anyway.
	originalCss: string,
}

export function defaultFormNote():FormNote {
	return {
		id: '',
		parent_id: '',
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
	localState: any,
	item: any,
}

export interface ResourceInfos {
	[index:string]: ResourceInfo,
}

export enum ScrollOptionTypes {
	None = 0,
	Hash = 1,
	Percent = 2,
}

export interface ScrollOptions {
	type: ScrollOptionTypes,
	value: any,
}

export interface OnChangeEvent {
	changeId: number;
	content: any;
}

export interface EditorCommand {
	name: string;
	value: any;
}
