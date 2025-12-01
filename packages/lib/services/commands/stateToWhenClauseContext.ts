import { State, stateUtils } from '../../reducer';
import BaseModel, { ModelType } from '../../BaseModel';
import Folder from '../../models/Folder';
import MarkupToHtml from '@joplin/renderer/MarkupToHtml';
import { isRootSharedFolder, isSharedFolderOwner } from '../share/reducer';
import { NoteEntity } from '../database/types';
import { itemIsReadOnlySync, ItemSlice } from '../../models/utils/readOnly';
import ItemChange from '../../models/ItemChange';
import { getTrashFolderId } from '../trash';
import getActivePluginEditorView from '../plugins/utils/getActivePluginEditorView';
import { MarkupLanguage } from '@joplin/renderer';

export interface WhenClauseContextOptions {
	commandFolderId?: string;
	commandFolderIds?: string[];
	commandNoteId?: string;
	windowId?: string;
}

export interface WhenClauseContext {
	allSelectedNotesAreDeleted: boolean;
	selectionIncludesHtmlNotes: boolean;
	foldersAreDeleted: boolean;
	foldersIncludeReadOnly: boolean;
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
	hasActivePluginEditor: boolean;
}

export default function stateToWhenClauseContext(state: State, options: WhenClauseContextOptions = null): WhenClauseContext {
	options = {
		commandFolderIds: options?.commandFolderId ? [options.commandFolderId] : null,
		...options,
	};
	const windowState = options.windowId ? stateUtils.windowStateById(state, options.windowId) : state;

	const selectedNoteIds = windowState.selectedNoteIds || [];
	const selectedNoteId = selectedNoteIds.length === 1 ? selectedNoteIds[0] : null;
	const selectedNote: NoteEntity = selectedNoteId ? BaseModel.byId(windowState.notes, selectedNoteId) : null;
	const selectedNotes = BaseModel.modelsByIds(windowState.notes ?? [], selectedNoteIds);

	const selectedFolderIds = windowState.selectedFolderIds || [];
	const commandFolderIds = state.notesParentType === 'Folder' ? (options.commandFolderIds || selectedFolderIds) : [];
	const commandFolders = commandFolderIds.length ? BaseModel.modelsByIds(state.folders, commandFolderIds) : [];
	const commandFolder = commandFolders.length ? commandFolders[0] : null;

	const { editorPlugin } = state.pluginService ? getActivePluginEditorView(state.pluginService.plugins, windowState.windowId) : { editorPlugin: null };

	const settings = state.settings || {};

	return {
		// Application state
		notesAreBeingSaved: stateUtils.hasNotesBeingSaved(state),
		syncStarted: state.syncStarted,

		// Current location
		inConflictFolder: windowState.selectedFolderId === Folder.conflictFolderId(),
		inTrash: !!((windowState.selectedFolderId === getTrashFolderId() && !!selectedNote?.deleted_time) || commandFolder && !!commandFolder.deleted_time),

		// Note selection
		oneNoteSelected: !!selectedNote,
		someNotesSelected: selectedNoteIds.length > 0,
		multipleNotesSelected: selectedNoteIds.length > 1,
		noNotesSelected: !selectedNoteIds.length,

		// Selected notes properties
		allSelectedNotesAreDeleted: !selectedNotes.find(n => !n.deleted_time),
		selectionIncludesHtmlNotes: selectedNotes.some(n => n.markup_language === MarkupLanguage.Html),

		// Note history
		historyhasBackwardNotes: windowState.backwardHistoryNotes && windowState.backwardHistoryNotes.length > 0,
		historyhasForwardNotes: windowState.forwardHistoryNotes && windowState.forwardHistoryNotes.length > 0,

		// Folder selection
		oneFolderSelected: selectedFolderIds.length === 1,

		// Current note properties
		noteIsTodo: selectedNote ? !!selectedNote.is_todo : false,
		noteTodoCompleted: selectedNote ? !!selectedNote.todo_completed : false,
		noteIsMarkdown: selectedNote ? selectedNote.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN : false,
		noteIsHtml: selectedNote ? selectedNote.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML : false,
		noteIsReadOnly: selectedNote ? itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, selectedNote as ItemSlice, settings['sync.userId'], state.shareService) : false,
		noteIsDeleted: selectedNote ? !!selectedNote.deleted_time : false,

		// Current context folder -- if multiple folders are selected, this only applies to one
		folderIsShareRoot: commandFolder ? isRootSharedFolder(commandFolder) : false,
		folderIsShareRootAndNotOwnedByUser: commandFolder ? isRootSharedFolder(commandFolder) && !isSharedFolderOwner(state, commandFolder.id) : false,
		folderIsShareRootAndOwnedByUser: commandFolder ? isRootSharedFolder(commandFolder) && isSharedFolderOwner(state, commandFolder.id) : false,
		folderIsShared: commandFolder ? !!commandFolder.share_id : false,
		folderIsDeleted: commandFolder ? !!commandFolder.deleted_time : false,
		folderIsTrash: commandFolder ? commandFolder.id === getTrashFolderId() : false,
		folderIsReadOnly: commandFolder ? itemIsReadOnlySync(ModelType.Folder, ItemChange.SOURCE_UNSPECIFIED, commandFolder as ItemSlice, settings['sync.userId'], state.shareService) : false,

		// All context folders
		foldersAreDeleted: commandFolders.every(f => !!f.deleted_time),
		foldersIncludeReadOnly: commandFolders.some(f => itemIsReadOnlySync(ModelType.Folder, ItemChange.SOURCE_UNSPECIFIED, f as ItemSlice, settings['sync.userId'], state.shareService)),

		joplinServerConnected: [9, 10, 11].includes(settings['sync.target']),
		joplinCloudAccountType: settings['sync.target'] === 10 ? settings['sync.10.accountType'] : 0,
		hasMultiProfiles: state.profileConfig && state.profileConfig.profiles.length > 1,

		hasActivePluginEditor: !!editorPlugin,
	};
}
