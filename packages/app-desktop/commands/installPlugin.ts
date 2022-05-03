import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import Setting from '@joplin/lib/models/Setting';
import Logger from '@joplin/lib/Logger';

export const declaration: CommandDeclaration = {
	name: 'installPlugin',
};

const logger = Logger.create('installPlugin');

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, pluginId: string) => {
			if (!pluginId) throw new Error('Plugin Id not provided');
			const repoUrl = 'https://github.com/joplin/plugins';
			const pluginService = PluginService.instance();
			const repoApi = new RepositoryApi(repoUrl, Setting.value('tempDir'));

			Object.keys(pluginService.plugins).map((key, _) => {
				if (key === pluginId) throw new Error(`Plugin ${pluginId} is already installed`);
			});

			try {
				await repoApi.initialize();
				const jplPath = await repoApi.downloadPlugin(pluginId);
				void pluginService.installPlugin(jplPath);
			} catch (error) {
				logger.error(error);
			}
		},
	};
};
