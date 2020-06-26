import WebviewController from './WebviewController';
import { Sandbox, SandboxContext } from './utils/types';
import Plugin from './Plugin';
const { shim } = require('lib/shim');
const Api = require('lib/services/rest/Api');
const eventManager = require('lib/eventManager');

interface NewSandboxResult {
	sandbox: Sandbox,
	context: SandboxContext,
}

export default function(plugin:Plugin, store:any):NewSandboxResult {
	const api = new Api();

	return (() => {
		const fsDriver = shim.fsDriver();

		function serializeApiBody(body:any) {
			if (typeof body !== 'string') return JSON.stringify(body);
			return body;
		}

		// Context contains the data that is sent from the plugin to the app
		// Currently it only contains the object that's registered when
		// the plugin calls `joplin.plugins.register()`
		const context:SandboxContext = {
			runtime: null,
		};

		// The sandbox is the runtime that the plugin sees, including the
		// `joplin` global object, `console`, etc.
		const sandbox:Sandbox = {
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
						context.runtime = script;
					},
				},
				filters: {
					on: (name:string, callback:Function) => {
						eventManager.filterOn(name, callback);
					},
					off: (name:string, callback:Function) => {
						eventManager.filterOff(name, callback);
					},
				},
				events: {
					on: (name:string, callback:Function) => {
						eventManager.on(name, callback);
					},
					off: (name:string, callback:Function) => {
						eventManager.off(name, callback);
					},
				},
				windows: {
					createWebviewPanel: (/* options:any*/) => {
						const controller = new WebviewController(plugin.id, plugin.baseDir, store);
						plugin.addViewController(controller);
						return controller;
					},
				},
			},
			console: console,
			setTimeout: (fn:Function, interval:number) => {
				return setTimeout(() => {
					fn();
				}, interval);
			},
			setInterval: (fn:Function, interval:number) => {
				return setInterval(() => {
					fn();
				}, interval);
			},
			require: (path:string):any => {
				let pathToLoad = path;

				if (path.indexOf('.') === 0) {
					const absolutePath = fsDriver.resolve(`${plugin.baseDir}/${path}`);
					if (absolutePath.indexOf(plugin.baseDir) !== 0) throw new Error('Can only load files from within the plugin directory');
					pathToLoad = absolutePath;
				} else {
					if (path.indexOf('lib/') === 0) throw new Error('Access to internal lib is not allowed');
				}

				return require(pathToLoad);
			},
		};

		return { sandbox, context };
	})();
}
