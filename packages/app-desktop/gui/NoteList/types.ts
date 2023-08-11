import { FolderEntity, ItemRendererDatabaseDependency, NoteEntity } from '@joplin/lib/services/database/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { Size } from '@joplin/utils/types';

export interface Props {
	themeId: any;
	selectedNoteIds: string[];
	notes: NoteEntity[];
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	watchedNoteFiles: any[];
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
	size: any;
	searches: any[];
	selectedSearchId: string;
	highlightedWords: string[];
	provisionalNoteIds: string[];
	visible: boolean;
	focusedField: string;
	parentFolderIsReadOnly: boolean;
}

export enum ItemFlow {
	TopToBottom = 'topToBottom',
	LeftToRight = 'leftToRight',
}

export type RenderNoteView = Record<string, any>;

export type OnRenderNoteHandler = (props: any)=> Promise<RenderNoteView>;

export type ItemRendererDepependency = ItemRendererDatabaseDependency | 'item.size.width' | 'item.size.height' | 'item.selected';

export interface ItemRenderer {
	flow: ItemFlow;
	itemSize: Size;
	dependencies: ItemRendererDepependency[];
	itemTemplate: string;
	onRenderNote: OnRenderNoteHandler;
}
