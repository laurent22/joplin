import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import bridge from '../../../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'permanentlyDeleteNote',
	label: () => _('Permanently delete note'),
	iconName: 'fa-times',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;
			if (!noteIds.length) return;
			const msg = await Note.permanentlyDeleteMessage(noteIds);

			const ok = bridge().showConfirmMessageBox(msg, {
				buttons: [_('Delete'), _('Cancel')],
				defaultId: 1,
			});

			if (ok) {
				await Note.batchDelete(noteIds, { toTrash: false, sourceDescription: 'permanentlyDeleteNote command' });
			}
		},
		enabledCondition: '(!noteIsReadOnly || inTrash) && someNotesSelected',
	};
};
