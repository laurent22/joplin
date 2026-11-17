import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { DesktopCommandContext } from '../../../services/commands/types';
import setNotesLockState, { BulkNoteLockTarget } from '../utils/setNotesLockState';

export const declaration: CommandDeclaration = {
	name: 'removeNoteLockFromNotes',
	label: () => _('Remove note lock from these notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: DesktopCommandContext, target: BulkNoteLockTarget = null) => {
			await setNotesLockState(context, target, false);
		},
		enabledCondition: 'someNotesSelected && !inTrash && !inConflictFolder',
	};
};
