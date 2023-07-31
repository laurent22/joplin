import Global from '@joplin/lib/services/plugins/api/Global';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('PluginRunner');

export default class PluginRunner extends BasePluginRunner {

	public async run(plugin: Plugin, sandbox: Global): Promise<void> {
		logger.info(`Run plugin: ${plugin.id}`);
		plugin.module.main.initPlugin(sandbox.joplin);
	}

}
