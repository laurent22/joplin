import PluginService from '@joplin/lib/services/plugins/PluginService';
import { Store } from 'redux';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';

class MockPluginRunner extends BasePluginRunner {
	public override async run() {}
	public override async stop() {}
}

const pluginServiceSetup = (store: Store) => {
	const runner = new MockPluginRunner();
	PluginService.instance().initialize(
		'2.14.0', { joplin: {} }, runner, store,
	);
};

export default pluginServiceSetup;
