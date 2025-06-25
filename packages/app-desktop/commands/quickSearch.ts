import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
const { _ } = require('@joplin/lib/locale');

export const declaration: CommandDeclaration = {
	name: 'quickSearch',
	label: () => _('Quick Search...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({
				type: 'PLUGINLEGACY_DIALOG_SET',
				open: true,
				pluginName: 'quickSearch',
			});
		},
	};
};
