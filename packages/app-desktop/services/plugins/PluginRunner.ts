import Plugin from '@joplin/lib/services/plugins/Plugin';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import executeSandboxCall from '@joplin/lib/services/plugins/utils/executeSandboxCall';
import Global from '@joplin/lib/services/plugins/api/Global';
import bridge from '../bridge';
import Setting from '@joplin/lib/models/Setting';
import { EventHandlers } from '@joplin/lib/services/plugins/utils/mapEventHandlersToIds';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
// import BackOffHandler from './BackOffHandler';
const ipcRenderer = require('electron').ipcRenderer;

const logger = Logger.create('PluginRunner');

// Electron error messages are useless so wrap the renderer call and print
// additional information when an error occurs.
function ipcRendererSend(message: string, args: any) {
	try {
		return ipcRenderer.send(message, args);
	} catch (error) {
		logger.error('Could not send IPC message:', message, ': ', args, error);
		throw error;
	}
}

enum PluginMessageTarget {
	MainWindow = 'mainWindow',
	Plugin = 'plugin',
}

export interface PluginMessage {
	target: PluginMessageTarget;
	pluginId: string;
	callbackId?: string;
	path?: string;
	args?: any[];
	result?: any;
	error?: any;
	mainWindowCallbackId?: string;
}

let callbackIndex = 1;
const callbackPromises: any = {};

function mapEventIdsToHandlers(pluginId: string, arg: any) {
	if (Array.isArray(arg)) {
		for (let i = 0; i < arg.length; i++) {
			arg[i] = mapEventIdsToHandlers(pluginId, arg[i]);
		}
		return arg;
	} else if (typeof arg === 'string' && arg.indexOf('___plugin_event_') === 0) {
		const eventId = arg;

		return async (...args: any[]) => {
			const callbackId = `cb_${pluginId}_${Date.now()}_${callbackIndex++}`;

			const promise = new Promise((resolve, reject) => {
				callbackPromises[callbackId] = { resolve, reject };
			});

			ipcRendererSend('pluginMessage', {
				callbackId: callbackId,
				target: PluginMessageTarget.Plugin,
				pluginId: pluginId,
				eventId: eventId,
				args: args,
			});

			return promise;
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

	protected eventHandlers_: EventHandlers = {};
	// private backOffHandlers_: Record<string, BackOffHandler> = {};

	public constructor() {
		super();

		this.eventHandler = this.eventHandler.bind(this);
	}

	private async eventHandler(eventHandlerId: string, args: any[]) {
		const cb = this.eventHandlers_[eventHandlerId];
		return cb(...args);
	}

	// private backOffHandler(pluginId: string): BackOffHandler {
	// 	if (!this.backOffHandlers_[pluginId]) {
	// 		this.backOffHandlers_[pluginId] = new BackOffHandler(pluginId);
	// 	}
	// 	return this.backOffHandlers_[pluginId];
	// }

	public async run(plugin: Plugin, pluginApi: Global) {
		const scriptPath = `${Setting.value('tempDir')}/plugin_${plugin.id}.js`;
		await shim.fsDriver().writeFile(scriptPath, plugin.scriptText, 'utf8');

		const pluginWindow = bridge().newBrowserWindow({
			show: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
		});

		require('@electron/remote/main').enable(pluginWindow.webContents);

		bridge().electronApp().registerPluginWindow(plugin.id, pluginWindow);

		void pluginWindow.loadURL(`${require('url').format({
			pathname: require('path').join(__dirname, 'plugin_index.html'),
			protocol: 'file:',
			slashes: true,
		})}?pluginId=${encodeURIComponent(plugin.id)}&pluginScript=${encodeURIComponent(`file://${scriptPath}`)}`);

		if (plugin.devMode) {
			pluginWindow.webContents.once('dom-ready', () => {
				// Need to open with a delay, otherwise it doesn't show up
				setTimeout(() => {
					pluginWindow.webContents.openDevTools({ mode: 'detach' });
				}, 3000);
			});
		}

		ipcRenderer.on('pluginMessage', async (_event: any, message: PluginMessage) => {
			if (message.target !== PluginMessageTarget.MainWindow) return;
			if (message.pluginId !== plugin.id) return;

			if (message.mainWindowCallbackId) {
				const promise = callbackPromises[message.mainWindowCallbackId];

				if (!promise) {
					console.error('Got a callback without matching promise: ', message);
					return;
				}

				if (message.error) {
					promise.reject(message.error);
				} else {
					promise.resolve(message.result);
				}
			} else {
				const mappedArgs = mapEventIdsToHandlers(plugin.id, message.args);
				const fullPath = `joplin.${message.path}`;

				// Don't log complete HTML code, which can be long, for setHtml calls
				const debugMappedArgs = fullPath.includes('setHtml') || fullPath.includes('imaging') ? '<hidden>' : mappedArgs;
				logger.debug(`Got message (3): ${fullPath}`, debugMappedArgs);

				this.recordCallStat(plugin.id);

				// try {
				// 	await this.backOffHandler(plugin.id).wait(fullPath, debugMappedArgs);
				// } catch (error) {
				// 	logger.error(error);
				// 	return;
				// }

				let result: any = null;
				let error: any = null;
				try {
					result = await executeSandboxCall(plugin.id, pluginApi, fullPath, mappedArgs, this.eventHandler);
				} catch (e) {
					error = e ? e : new Error('Unknown error');
				}

				ipcRendererSend('pluginMessage', {
					target: PluginMessageTarget.Plugin,
					pluginId: plugin.id,
					pluginCallbackId: message.callbackId,
					result: result,
					error: error,
				});
			}
		});
	}

}
