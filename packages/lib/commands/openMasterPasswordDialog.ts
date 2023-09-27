import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';

export const declaration: CommandDeclaration = {
	name: 'openMasterPasswordDialog',
	label: () => _('Manage master password...'),
	iconName: 'fas fa-key',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, isOpen = true) => {
			context.dispatch({
				type: 'DIALOG_OPEN',
				name: 'masterPassword',
				isOpen: isOpen,
			});
		},
	};
};
