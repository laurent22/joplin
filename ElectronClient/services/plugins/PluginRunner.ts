import Plugin from 'lib/services/plugins/Plugin';
import BasePluginRunner from 'lib/services/plugins/BasePluginRunner';
import executeSandboxCall from 'lib/services/plugins/utils/executeSandboxCall';
import Global from 'lib/services/plugins/api/Global';
import bridge from '../bridge';
import Setting from 'lib/models/Setting';
import { EventHandlers } from 'lib/services/plugins/utils/mapEventHandlersToIds';
import shim from 'lib/shim';
const ipcRenderer = require('electron').ipcRenderer;

enum PluginMessageTarget {
	MainWindow = 'mainWindow',
	Plugin = 'plugin',
}

export interface PluginMessage {
	target: PluginMessageTarget,
	pluginId: string,
	callbackId?: string,
	path?: string,
	args?: any[],
	result?: any,
	error?: any,
}

function mapEventIdsToHandlers(pluginId:string, arg:any) {
	if (Array.isArray(arg)) {
		for (let i = 0; i < arg.length; i++) {
			arg[i] = mapEventIdsToHandlers(pluginId, arg[i]);
		}
		return arg;
	} else if (typeof arg === 'string' && arg.indexOf('___plugin_event_') === 0) {
		const eventId = arg;

		return async (...args:any[]) => {
			ipcRenderer.send('pluginMessage', {
				target: PluginMessageTarget.Plugin,
				pluginId: pluginId,
				eventId: eventId,
				args: args,
			});
		};
	} else if (arg === null) {
		return null;
	} else if (arg === undefined) {
		return undefined;
	} else if (typeof arg === 'object') {
		for (const n in arg) {
			arg[n] = mapEventIdsToHandlers(pluginId, arg[n]);
		}
	}

	return arg;
}

export default class PluginRunner extends BasePluginRunner {

	protected eventHandlers_:EventHandlers = {};

	constructor() {
		super();

		this.eventHandler = this.eventHandler.bind(this);
	}

	private async eventHandler(eventHandlerId:string, args:any[]) {
		const cb = this.eventHandlers_[eventHandlerId];
		return cb(...args);
	}

	async run(plugin:Plugin, pluginApi:Global) {
		const scriptPath = `${Setting.value('tempDir')}/plugin_${plugin.id}.js`;
		await shim.fsDriver().writeFile(scriptPath, plugin.scriptText, 'utf8');

		const pluginWindow = bridge().newBrowserWindow({
			show: false,
			webPreferences: {
				nodeIntegration: true,
			},
		});

		bridge().electronApp().registerPluginWindow(plugin.id, pluginWindow);

		pluginWindow.loadURL(`${require('url').format({
			pathname: require('path').join(__dirname, 'plugin_index.html'),
			protocol: 'file:',
			slashes: true,
		})}?pluginId=${encodeURIComponent(plugin.id)}&pluginScript=${encodeURIComponent(`file://${scriptPath}`)}`);

		pluginWindow.webContents.once('dom-ready', () => {
			pluginWindow.webContents.openDevTools();
		});

		ipcRenderer.on('pluginMessage', async (_event:any, message:PluginMessage) => {
			if (message.target !== PluginMessageTarget.MainWindow) return;
			if (message.pluginId !== plugin.id) return;

			const mappedArgs = mapEventIdsToHandlers(plugin.id, message.args);
			const fullPath = `joplin.${message.path}`;

			this.logger().debug(`PluginRunner: execute call: ${fullPath}: ${mappedArgs}`);

			let result:any = null;
			let error:any = null;
			try {
				result = await executeSandboxCall(plugin.id, pluginApi, fullPath, mappedArgs, this.eventHandler);
			} catch (e) {
				error = e ? e : new Error('Unknown error');
			}

			ipcRenderer.send('pluginMessage', {
				target: PluginMessageTarget.Plugin,
				pluginId: plugin.id,
				callbackId: message.callbackId,
				result: result,
				error: error,
			});
		});
	}

}
