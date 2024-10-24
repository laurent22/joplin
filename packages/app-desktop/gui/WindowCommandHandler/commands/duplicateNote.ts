import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'duplicateNote',
	label: () => _('Duplicate'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;

			for (let i = 0; i < noteIds.length; i++) {
				const note = await Note.load(noteIds[i]);
				await Note.duplicate(noteIds[i], {
					uniqueTitle: _('%s - Copy', note.title),
				});
			}
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
