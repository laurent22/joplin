import Global from '@joplin/lib/services/plugins/api/Global';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import Plugin from '@joplin/lib/services/plugins/Plugin';

export default class PluginRunner extends BasePluginRunner {

	public async run(plugin: Plugin, sandbox: Global): Promise<void> {
		plugin.module.setJoplin(sandbox.joplin);
		await sandbox.joplin.plugins.register(plugin.module.script);
	}

}
