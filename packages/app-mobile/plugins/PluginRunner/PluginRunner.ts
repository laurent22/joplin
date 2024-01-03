import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import { PluginRunnerWebViewControl } from './PluginRunnerWebView';
import Global from '@joplin/lib/services/plugins/api/Global';
import Plugin from '@joplin/lib/services/plugins/Plugin';


export default class PluginRunner extends BasePluginRunner {
	public constructor(private webviewControl: PluginRunnerWebViewControl) {
		super();
	}

	public override async run(plugin: Plugin, pluginApi: Global) {
		this.webviewControl.runPlugin(plugin, pluginApi);
	}
}
