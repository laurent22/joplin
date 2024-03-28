import PluginService from '@joplin/lib/services/plugins/PluginService';

const pluginServiceSetup = () => {
	const runner = { run: ()=> {}, stop: ()=>{} } as any;
	PluginService.instance().initialize(
		'2.14.0', { joplin: {} }, runner, { dispatch: ()=>{}, getState: ()=>{} },
	);
};

export default pluginServiceSetup;
