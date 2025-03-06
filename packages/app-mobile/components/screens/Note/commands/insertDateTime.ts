import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { CommandRuntimeProps } from '../types';
import time from '@joplin/lib/time';

export const declaration: CommandDeclaration = {
	name: 'insertDateTime',
	label: () => _('Insert time'),
	iconName: 'material calendar-plus',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			props.insertText(time.formatDateToLocal(new Date()));
		},

		enabledCondition: '!noteIsReadOnly',
	};
};
