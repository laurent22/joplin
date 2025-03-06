import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { CommandRuntimeProps } from '../types';

export const declaration: CommandDeclaration = {
	name: 'hideKeyboard',
	label: () => _('Hide keyboard'),
	iconName: 'material keyboard-close',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			props.hideKeyboard();
		},
		enabledCondition: 'keyboardVisible',
	};
};
