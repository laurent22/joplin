import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'dismissPluginPanels',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({
				type: 'SET_PLUGIN_PANELS_DIALOG_VISIBLE',
				visible: false,
			});
		},
	};
};
