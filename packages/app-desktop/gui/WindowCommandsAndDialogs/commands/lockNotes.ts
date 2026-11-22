import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { DesktopCommandContext } from '../../../services/commands/types';
import setNotesLockState, { BulkNoteLockTarget } from '../utils/setNotesLockState';

export const declaration: CommandDeclaration = {
	name: 'lockNotes',
	label: () => _('Lock these notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: DesktopCommandContext, target: BulkNoteLockTarget = null) => {
			await setNotesLockState(context, target, true);
		},
		enabledCondition: 'someNotesSelected && !inTrash && !inConflictFolder',
	};
};
