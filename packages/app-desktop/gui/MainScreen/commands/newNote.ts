import { utils, CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'newNote',
	label: () => _('New note'),
	iconName: 'fa-file',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, body: string = '', isTodo: boolean = false) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const defaultValues = Note.previewFieldsWithDefaultValues({ includeTimestamps: false });

			let newNote = { ...defaultValues, parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
				body: body };

			newNote = await Note.save(newNote, { provisional: true });

			void Note.updateGeolocation(newNote.id);

			utils.store.dispatch({
				type: 'NOTE_SELECT',
				id: newNote.id,
			});
		},
		enabledCondition: 'oneFolderSelected && !inConflictFolder',
	};
};
