import { State, stateUtils } from '../../reducer';
import BaseModel, { ModelType } from '../../BaseModel';
import Folder from '../../models/Folder';
import MarkupToHtml from '@joplin/renderer/MarkupToHtml';
import { isRootSharedFolder, isSharedFolderOwner } from '../share/reducer';
import { FolderEntity, NoteEntity } from '../database/types';
import { itemIsReadOnlySync, ItemSlice } from '../../models/utils/readOnly';
import ItemChange from '../../models/ItemChange';
import { getTrashFolderId } from '../trash';

export interface WhenClauseContextOptions {
	commandFolderId?: string;
	commandNoteId?: string;
}

export interface WhenClauseContext {
	allSelectedNotesAreDeleted: boolean;
	folderIsDeleted: boolean;
	folderIsReadOnly: boolean;
	folderIsShared: boolean;
	folderIsShareRoot: boolean;
	folderIsShareRootAndNotOwnedByUser: boolean;
	folderIsShareRootAndOwnedByUser: boolean;
	folderIsTrash: boolean;
	hasMultiProfiles: boolean;
	historyhasBackwardNotes: boolean;
	historyhasForwardNotes: boolean;
	inConflictFolder: boolean;
	inTrash: boolean;
	joplinCloudAccountType: number;
	joplinServerConnected: boolean;
	multipleNotesSelected: boolean;
	noNotesSelected: boolean;
	noteIsDeleted: boolean;
	noteIsHtml: boolean;
	noteIsMarkdown: boolean;
	noteIsReadOnly: boolean;
	noteIsTodo: boolean;
	notesAreBeingSaved: boolean;
	noteTodoCompleted: boolean;
	oneFolderSelected: boolean;
	oneNoteSelected: boolean;
	someNotesSelected: boolean;
	syncStarted: boolean;
}

export default function stateToWhenClauseContext(state: State, options: WhenClauseContextOptions = null): WhenClauseContext {
	options = {
		commandFolderId: '',
		commandNoteId: '',
		...options,
	};

	const selectedNoteIds = state.selectedNoteIds || [];
	const selectedNoteId = selectedNoteIds.length === 1 ? selectedNoteIds[0] : null;
	const selectedNote: NoteEntity = selectedNoteId ? BaseModel.byId(state.notes, selectedNoteId) : null;
	const selectedNotes = BaseModel.modelsByIds(state.notes ?? [], selectedNoteIds);

	const commandFolderId = options.commandFolderId || state.selectedFolderId;
	const commandFolder: FolderEntity = commandFolderId ? BaseModel.byId(state.folders, commandFolderId) : null;

	const settings = state.settings || {};

	return {
		// Application state
		notesAreBeingSaved: stateUtils.hasNotesBeingSaved(state),
		syncStarted: state.syncStarted,

		// Current location
		inConflictFolder: state.selectedFolderId === Folder.conflictFolderId(),
		inTrash: !!((state.selectedFolderId === getTrashFolderId() && !!selectedNote?.deleted_time) || commandFolder && !!commandFolder.deleted_time),

		// Note selection
		oneNoteSelected: !!selectedNote,
		someNotesSelected: selectedNoteIds.length > 0,
		multipleNotesSelected: selectedNoteIds.length > 1,
		noNotesSelected: !selectedNoteIds.length,

		// Selected notes properties
		allSelectedNotesAreDeleted: !selectedNotes.find(n => !n.deleted_time),

		// Note history
		historyhasBackwardNotes: state.backwardHistoryNotes && state.backwardHistoryNotes.length > 0,
		historyhasForwardNotes: state.forwardHistoryNotes && state.forwardHistoryNotes.length > 0,

		// Folder selection
		oneFolderSelected: !!state.selectedFolderId,

		// Current note properties
		noteIsTodo: selectedNote ? !!selectedNote.is_todo : false,
		noteTodoCompleted: selectedNote ? !!selectedNote.todo_completed : false,
		noteIsMarkdown: selectedNote ? selectedNote.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN : false,
		noteIsHtml: selectedNote ? selectedNote.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML : false,
		noteIsReadOnly: selectedNote ? itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, selectedNote as ItemSlice, settings['sync.userId'], state.shareService) : false,
		noteIsDeleted: selectedNote ? !!selectedNote.deleted_time : false,

		// Current context folder
		folderIsShareRoot: commandFolder ? isRootSharedFolder(commandFolder) : false,
		folderIsShareRootAndNotOwnedByUser: commandFolder ? isRootSharedFolder(commandFolder) && !isSharedFolderOwner(state, commandFolder.id) : false,
		folderIsShareRootAndOwnedByUser: commandFolder ? isRootSharedFolder(commandFolder) && isSharedFolderOwner(state, commandFolder.id) : false,
		folderIsShared: commandFolder ? !!commandFolder.share_id : false,
		folderIsDeleted: commandFolder ? !!commandFolder.deleted_time : false,
		folderIsTrash: commandFolder ? commandFolder.id === getTrashFolderId() : false,
		folderIsReadOnly: commandFolder ? itemIsReadOnlySync(ModelType.Folder, ItemChange.SOURCE_UNSPECIFIED, commandFolder as ItemSlice, settings['sync.userId'], state.shareService) : false,

		joplinServerConnected: [9, 10].includes(settings['sync.target']),
		joplinCloudAccountType: settings['sync.target'] === 10 ? settings['sync.10.accountType'] : 0,
		hasMultiProfiles: state.profileConfig && state.profileConfig.profiles.length > 1,
	};
}
