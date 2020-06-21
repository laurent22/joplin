import Plugin from './Plugin';
import WebviewController from './WebviewController';
const { shim } = require('lib/shim');
const Api = require('lib/services/rest/Api');
const eventManager = require('lib/eventManager');

export default class SandboxService {

	public api:any;
	public viewControllers:any[] = [];

	constructor() {
		this.api = new Api();
	}

	public newSandbox(plugin:Plugin) {
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
							return this.api.route('GET', path, query);
						},
						post: (path:string, query:any = null, body:any = null, files:any[] = null) => {
							return this.api.route('POST', path, query, serializeApiBody(body), files);
						},
						put: (path:string, query:any = null, body:any = null, files:any[] = null) => {
							return this.api.route('PUT', path, query, serializeApiBody(body), files);
						},
						delete: (path:string, query:any = null) => {
							return this.api.route('DELETE', path, query);
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
							const controller = new WebviewController();
							this.viewControllers.push(controller);
							// controller.html = 'Just <b>testing</b>';
							return controller;

							// const controller = new ViewController();

							// return new Promise((resolve:Function, reject:Function) => {
							// 	this.views.push({
							// 		options: options,
							// 		createPromise: { resolve, reject },
							// 	});
							// });
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

}
