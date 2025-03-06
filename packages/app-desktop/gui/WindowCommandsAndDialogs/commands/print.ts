import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowControl } from '../utils/useWindowControl';
const bridge = require('@electron/remote').require('./bridge').default;

export const declaration: CommandDeclaration = {
	name: 'print',
	label: () => _('Print'),
	iconName: 'fa-file',
};

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			try {
				if (noteIds.length !== 1) throw new Error(_('Only one note can be printed at a time.'));
				await comp.printTo('printer', { noteId: noteIds[0] });
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}
		},
		enabledCondition: 'someNotesSelected',
	};
};
