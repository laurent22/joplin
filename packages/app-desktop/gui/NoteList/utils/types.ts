import { FolderEntity, ItemRendererDatabaseDependency, NoteEntity } from '@joplin/lib/services/database/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { Size } from '@joplin/utils/types';
import { Dispatch } from 'redux';

export interface Props {
	themeId: any;
	selectedNoteIds: string[];
	notes: NoteEntity[];
	dispatch: Dispatch;
	watchedNoteFiles: string[];
	plugins: PluginStates;
	selectedFolderId: string;
	customCss: string;
	notesParentType: string;
	noteSortOrder: string;
	uncompletedTodosOnTop: boolean;
	showCompletedTodos: boolean;
	resizableLayoutEventEmitter: any;
	isInsertingNotes: boolean;
	folders: FolderEntity[];
	size: Size;
	searches: any[];
	selectedSearchId: string;
	highlightedWords: string[];
	provisionalNoteIds: string[];
	visible: boolean;
	focusedField: string;
	parentFolderIsReadOnly: boolean;
}

export interface Context {
	noteId: string;
}

export enum ItemFlow {
	TopToBottom = 'topToBottom',
	LeftToRight = 'leftToRight',
}

export type RenderNoteView = Record<string, any>;

export interface OnChangeEvent {
	value: any;
}

export type OnRenderNoteHandler = (props: any)=> Promise<RenderNoteView>;
export type OnChangeHandler = (context: Context, elementId: string, event: OnChangeEvent)=> Promise<void>;

export type ListRendererDepependency =
	ItemRendererDatabaseDependency |
	'item.size.width' |
	'item.size.height' |
	'item.selected' |
	'item.index' |
	'note.titleHtml' |
	'note.isWatched';

export interface ListRenderer {
	flow: ItemFlow;
	itemSize: Size;
	itemCss: string;
	dependencies: ListRendererDepependency[];
	itemTemplate: string;
	onRenderNote: OnRenderNoteHandler;
	onChange: OnChangeHandler;
}
