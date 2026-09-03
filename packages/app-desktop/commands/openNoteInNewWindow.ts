import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { createAppDefaultWindowState } from '../app.reducer';
import Setting from '@joplin/lib/models/Setting';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import { ALL_NOTES_FILTER_ID } from '@joplin/lib/reserved-ids';

export const declaration: CommandDeclaration = {
	name: 'openNoteInNewWindow',
	label: () => _('Open in new window'),
	iconName: 'icon-share',
};

let idCounter = 0;

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			const note = await Note.load(noteId, { fields: Note.previewFields() });
			const parentFolder = await Folder.load(note.parent_id);
			let folderId = note.is_conflict && !note.deleted_time ? Folder.conflictFolderId() : getDisplayParentId(note, parentFolder);
			if (!note.is_conflict && !note.deleted_time && !parentFolder) folderId = ALL_NOTES_FILTER_ID;
			context.dispatch({
				type: 'WINDOW_OPEN',
				noteId,
				folderId,
				windowId: `window-${noteId}-${idCounter++}`,
				defaultAppWindowState: {
					...createAppDefaultWindowState(),
					noteVisiblePanes: Setting.value('noteVisiblePanes'),
					editorCodeView: Setting.value('editor.codeView'),
				},
			});
		},
		enabledCondition: 'oneNoteSelected',
	};
};
