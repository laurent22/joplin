import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowControl } from '../utils/useWindowControl';
import bridge from '../../../services/bridge';
import InteropServiceHelper from '../../../InteropServiceHelper';

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
				// A plugin can run this with any note, so a locked one is only printed once the user agrees, as for the PDF export.
				if (await InteropServiceHelper.confirmLockedNoteExport(context.dispatch, noteIds) !== 'export') return;
				if (!(await InteropServiceHelper.withoutUndecryptableNotes(noteIds)).length) return;
				await comp.printTo('printer', { noteId: noteIds[0] });
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}
		},
		enabledCondition: 'someNotesSelected && !noteLockContentUnavailable',
	};
};
