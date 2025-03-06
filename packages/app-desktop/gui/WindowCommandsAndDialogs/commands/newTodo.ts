import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { newNoteEnabledConditions } from './newNote';

export const declaration: CommandDeclaration = {
	name: 'newTodo',
	label: () => _('New to-do'),
	iconName: 'fa-check-square',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, body = '') => {
			return CommandService.instance().execute('newNote', body, true);
		},
		enabledCondition: newNoteEnabledConditions,
	};
};
