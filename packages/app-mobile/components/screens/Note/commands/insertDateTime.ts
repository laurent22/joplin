import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { CommandRuntimeProps } from '../types';
import { formatMsToLocal } from '@joplin/utils/time';

export const declaration: CommandDeclaration = {
	name: 'insertDateTime',
	label: () => _('Insert time'),
	iconName: 'material calendar-plus',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			props.insertText(formatMsToLocal(Date.now()));
		},

		enabledCondition: '!noteIsReadOnly',
	};
};
