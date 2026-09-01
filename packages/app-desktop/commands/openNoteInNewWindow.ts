import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { createAppDefaultWindowState } from '../app.reducer';
import Setting from '@joplin/lib/models/Setting';
import { getTrashFolderId } from '@joplin/lib/services/trash';

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
			const folderId = note.is_conflict ? Folder.conflictFolderId() : note.deleted_time ? getTrashFolderId() : note.parent_id;
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
