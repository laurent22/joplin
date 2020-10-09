import CommandService, { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'newTodo',
	label: () => _('New to-do'),
	iconName: 'fa-check-square',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async ({ template }:any) => {
			return CommandService.instance().execute('newNote', { template: template, isTodo: true });
		},
		isEnabled: () => {
			return CommandService.instance().isEnabled('newNote', {});
		},
		title: () => {
			return _('New to-do');
		},
	};
};
