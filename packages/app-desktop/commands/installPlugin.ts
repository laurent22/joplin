import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import app from '../app';

export const declaration: CommandDeclaration = {
	name: 'installPlugin',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, pluginId: string) => {
			if (!pluginId) throw new Error('Plugin Id not provided');
			const store = app().store();
			store.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				props: {
					defaultSection: 'plugins',
				},
			});
			store.dispatch({
				type: 'PLUGIN_SEARCH_QUERY',
				pluginId,
			});
		},
	};
};
