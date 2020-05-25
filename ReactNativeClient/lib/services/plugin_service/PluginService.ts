import * as vm from 'vm';
import Plugin from './Plugin';
import manifestFromObject from './utils/manifestFromObject';
const { shim } = require('lib/shim');
const Api = require('lib/services/rest/Api');
const { filename } = require('lib/path-utils');

class SandboxService {

	public api:any;

	constructor() {
		this.api = new Api();
	}

	public newSandbox(plugin:Plugin) {
		return (() => {
			const fsDriver = shim.fsDriver();

			// const requireWhiteList:string[] = [
			// 	// 'lib/models/Note',
			// 	// 'lib/models/Folder',
			// ];

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

export default class PluginService {

	private static instance_:PluginService = null;

	public static instance():PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	private sandboxService:SandboxService;
	private plugins_:Plugin[] = [];

	constructor() {
		this.sandboxService = new SandboxService();
	}

	logger() {
		return {
			error: console.error,
			info: console.info,
		};
	}

	public get plugins():Plugin[] {
		return this.plugins_;
	}

	async loadPlugin(path:string):Promise<Plugin> {
		const fsDriver = shim.fsDriver();

		let distPath = path;
		if (!(await fsDriver.exists(`${distPath}/manifest.json`))) {
			distPath = `${path}/dist`;
		}

		const manifestPath = `${distPath}/manifest.json`;
		const indexPath = `${distPath}/index.js`;
		const manifestContent = await fsDriver.readFile(manifestPath);
		const manifest = manifestFromObject(JSON.parse(manifestContent));
		const mainScriptContent = await fsDriver.readFile(indexPath);
		return new Plugin(filename(path), distPath, manifest, mainScriptContent);
	}

	async loadPlugins(pluginDir:string) {
		const fsDriver = shim.fsDriver();
		const pluginPaths = await fsDriver.readDirStats(pluginDir);

		for (const stat of pluginPaths) {
			if (!stat.isDirectory()) continue;
			const plugin = await this.loadPlugin(`${pluginDir}/${stat.path}`);
			await this.runPlugin(plugin);
			this.plugins.push(plugin);
		}
	}

	async runPlugin(plugin:Plugin) {
		const sandbox = this.sandboxService.newSandbox(plugin);

		vm.createContext(sandbox);

		vm.runInContext(plugin.scriptText, sandbox);

		if (plugin.script) {
			const startTime = Date.now();

			try {
				this.logger().info(`Starting plugin: ${plugin.id}`);
				await plugin.script.run(null);
			} catch (error) {
				// For some reason, error thrown from the executed script do not have the type "Error"
				// but are instead plain object. So recreate the Error object here so that it can
				// be handled correctly by loggers, etc.
				const newError:Error = new Error(error.message);
				newError.stack = error.stack;
				this.logger().error(plugin.id, `In plugin ${plugin.id}:`, newError);
			}

			this.logger().info(`Finished plugin: ${plugin.id} (Took ${Date.now() - startTime}ms)`);
		} else {
			throw new Error('No plugin was registered! Call joplin.plugins.register({.....}) from within the plugin.');
		}
	}

}
