import PluginService from '@joplin/lib/services/plugins/PluginService';

const pluginServiceSetup = () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const runner = { run: ()=> {}, stop: ()=>{} } as any;
	PluginService.instance().initialize(
		'2.14.0', { joplin: {} }, runner, { dispatch: ()=>{}, getState: ()=>{} },
	);
};

export default pluginServiceSetup;
