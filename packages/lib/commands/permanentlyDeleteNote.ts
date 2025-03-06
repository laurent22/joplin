import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';
import Note from '../models/Note';
import shim, { MessageBoxType } from '../shim';

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

			const deleteIndex = 0;
			const result = await shim.showMessageBox(msg, {
				buttons: [_('Delete'), _('Cancel')],
				defaultId: 1,
				cancelId: 1,
				type: MessageBoxType.Confirm,
			});

			if (result === deleteIndex) {
				await Note.batchDelete(noteIds, { toTrash: false, sourceDescription: 'permanentlyDeleteNote command' });
			}
		},
		enabledCondition: '(!noteIsReadOnly || inTrash) && someNotesSelected',
	};
};
