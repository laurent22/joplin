import PluginService from '@joplin/lib/services/plugins/PluginService';

const pluginServiceSetup = () => {
	PluginService.instance().initialize(
		'2.14.0', null, null, { dispatch: ()=>{}, getState: ()=>{} },
	);
};

export default pluginServiceSetup;
