import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { CommandRuntimeProps } from '../types';

export const declaration: CommandDeclaration = {
	name: 'setTags',
	label: () => _('Tags'),
	iconName: 'material tag-multiple',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			props.setTagDialogVisible(true);
		},

		enabledCondition: '!noteIsReadOnly',
	};
};
