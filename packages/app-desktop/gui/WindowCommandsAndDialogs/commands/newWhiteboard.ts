import { utils, CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
import { newWhiteboardBody } from '@joplin/lib/services/whiteboard/serialize';
import { newNoteEnabledConditions } from './newNote';

export const declaration: CommandDeclaration = {
	name: 'newWhiteboard',
	label: () => _('New whiteboard'),
	iconName: 'fa-th',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, title?: string) => {
			const folder = await Folder.getValidActiveFolder();
			if (!folder) return;

			const defaultValues = Note.previewFieldsWithDefaultValues({ includeTimestamps: false });

			let order;
			if (Setting.value('notes.sortOrder.field') === 'order') {
				order = await Note.getNextOrderValue(folder.id);
			}

			let newNote = {
				...defaultValues,
				parent_id: folder.id,
				is_todo: 0,
				title: title || _('Untitled whiteboard'),
				body: newWhiteboardBody(),
				...(order !== undefined ? { order } : {}),
			};

			newNote = await Note.save(newNote, { provisional: true });

			utils.store.dispatch({ type: 'NOTE_SELECT', id: newNote.id });
			utils.store.dispatch({ type: 'NOTE_SORT' });
		},
		enabledCondition: `${newNoteEnabledConditions} && whiteboardEnabled`,
	};
};
