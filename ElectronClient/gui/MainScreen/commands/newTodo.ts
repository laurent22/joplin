import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'newTodo',
	label: () => _('New to-do'),
	iconName: 'fa-check-square',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (_context:CommandContext, template:string = null) => {
			return CommandService.instance().execute('newNote', template, true);
		},
		enabledCondition: 'oneFolderSelected && !inConflictFolder',
	};
};
