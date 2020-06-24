import Plugin from './Plugin';
import WebviewController from './WebviewController';
const { shim } = require('lib/shim');
const Api = require('lib/services/rest/Api');
const eventManager = require('lib/eventManager');

export default function(plugin:Plugin, store:any) {
	const api = new Api();

	return (() => {
		const fsDriver = shim.fsDriver();

		function serializeApiBody(body:any) {
			if (typeof body !== 'string') return JSON.stringify(body);
			return body;
		}

		return {
			joplin: {
				api: {
					get: (path:string, query:any = null) => {
						return api.route('GET', path, query);
					},
					post: (path:string, query:any = null, body:any = null, files:any[] = null) => {
						return api.route('POST', path, query, serializeApiBody(body), files);
					},
					put: (path:string, query:any = null, body:any = null, files:any[] = null) => {
						return api.route('PUT', path, query, serializeApiBody(body), files);
					},
					delete: (path:string, query:any = null) => {
						return api.route('DELETE', path, query);
					},
				},
				plugins: {
					register: (script:any) => {
						plugin.script = script;
					},
				},
				filters: {
					on: (name:string, callback:Function) => {
						return eventManager.filterOn(name, callback);
					},
					off: (name:string, callback:Function) => {
						return eventManager.filterOff(name, callback);
					},
				},
				events: {
					on: (name:string, callback:Function) => {
						return eventManager.on(name, callback);
					},
					off: (name:string, callback:Function) => {
						return eventManager.off(name, callback);
					},
				},
				window: {
					createWebviewPanel: (/* options:any*/) => {
						const controller = new WebviewController(plugin.id, store);

						store.dispatch({
							type: 'PLUGIN_CONTROL_ADD',
							pluginId: plugin.id,
							control: controller.toObject(),
						});

						return controller;
					},
				},
			},
			console: console,
			require: (path:string):any => {
				let pathToLoad = path;

				if (path.indexOf('.') === 0) {
					const absolutePath = fsDriver.resolve(`${plugin.baseDir}/${path}`);
					if (absolutePath.indexOf(plugin.baseDir) !== 0) throw new Error('Can only load files from within the plugin directory');
					pathToLoad = absolutePath;
				} else {
					if (path.indexOf('lib/') === 0) throw new Error('Access to internal lib is not allowed');
					// if (!requireWhiteList.includes(path)) throw new Error(`Cannot access this module: ${path}`);
				}

				return require(pathToLoad);
			},
		};
	})();
}
