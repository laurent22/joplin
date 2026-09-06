import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import { defaultWindowId, stateUtils } from '@joplin/lib/reducer';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import bridge from '../../../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'revealInNotebook',
	label: () => _('Reveal in notebook'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			const note = await Note.load(noteId);
			if (!note) throw new Error(`No such note: ${noteId}`);
			const parentFolder = await Folder.load(note.parent_id);
			const folderId = note.is_conflict && !note.deleted_time ? Folder.conflictFolderId() : getDisplayParentId(note, parentFolder);
			const mainWindowState = stateUtils.windowStateById(context.state, defaultWindowId);
			const folderAlreadySelected = mainWindowState.selectedFolderId === folderId;
			const noteAlreadySelected = stateUtils.selectedNoteId(mainWindowState) === note.id;

			context.dispatch({
				type: 'WINDOW_FOCUS',
				windowId: defaultWindowId,
			});
			context.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId,
				noteId: note.id,
			});
			bridge().switchToMainWindow();
			if (folderAlreadySelected) await CommandService.instance().execute('focusElementSideBar');
			if (folderAlreadySelected && noteAlreadySelected) await CommandService.instance().execute('focusElementNoteList', note.id);
		},
		enabledCondition: 'someNotesSelected && !multipleNotesSelected',
	};
};
