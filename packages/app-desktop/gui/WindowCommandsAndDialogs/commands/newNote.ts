import { utils, CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
import { NoteEntity } from '@joplin/lib/services/database/types';

export const newNoteEnabledConditions = 'oneFolderSelected && selectedFolderIsValid && !inConflictFolder && !folderIsReadOnly && !folderIsTrash';

export interface CreateNoteOptions {
	body?: string;
	title?: string;
	isTodo?: boolean;
	updateGeolocation?: boolean;
}

// Shared helper used by both `newNote` and any sibling commands that create
// a fresh, provisional note in the currently-active folder (e.g. the
// whiteboard "New whiteboard" command). Returns null if there's no valid
// active folder. Caller is responsible for telling the user the command
// was a no-op in that case (it's already gated by `newNoteEnabledConditions`
// in practice).
export const createNoteInActiveFolder = async (options: CreateNoteOptions = {}): Promise<NoteEntity | null> => {
	const folder = await Folder.getValidActiveFolder();
	if (!folder) return null;

	const defaultValues = Note.previewFieldsWithDefaultValues({ includeTimestamps: false });

	let order;
	if (Setting.value('notes.sortOrder.field') === 'order') {
		order = await Note.getNextOrderValue(folder.id);
	}

	const note = await Note.save({
		...defaultValues,
		parent_id: folder.id,
		is_todo: options.isTodo ? 1 : 0,
		body: options.body ?? '',
		...(options.title ? { title: options.title } : {}),
		...(order !== undefined ? { order } : {}),
	}, { provisional: true });

	if (options.updateGeolocation !== false) {
		void Note.updateGeolocation(note.id);
	}

	utils.store.dispatch({ type: 'NOTE_SELECT', id: note.id });

	// Immediately sort the note list so that the new note is positioned
	// correctly before scrolling to it.
	utils.store.dispatch({ type: 'NOTE_SORT' });

	return note;
};

export const declaration: CommandDeclaration = {
	name: 'newNote',
	label: () => _('New note'),
	iconName: 'fa-file',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, body = '', isTodo = false) => {
			await createNoteInActiveFolder({ body, isTodo });
		},
		enabledCondition: newNoteEnabledConditions,
	};
};
