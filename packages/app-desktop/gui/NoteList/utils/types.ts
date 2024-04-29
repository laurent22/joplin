import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import { ListRenderer, NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { Size } from '@joplin/utils/types';
import { Dispatch } from 'redux';

export interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	resizableLayoutEventEmitter: any;
	isInsertingNotes: boolean;
	folders: FolderEntity[];
	size: Size;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	searches: any[];
	selectedSearchId: string;
	highlightedWords: string[];
	provisionalNoteIds: string[];
	visible: boolean;
	focusedField: string;
	parentFolderIsReadOnly: boolean;
	listRenderer: ListRenderer;
	columns: NoteListColumns;
	selectedFolderInTrash: boolean;
}

export enum BaseBreakpoint {
	Sm = 75,
	Md = 80,
	Lg = 120,
	Xl = 474,
}

export interface Breakpoints {
	Sm: number;
	Md: number;
	Lg: number;
	Xl: number;
}
