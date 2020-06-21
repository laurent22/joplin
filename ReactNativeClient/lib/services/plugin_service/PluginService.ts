import * as vm from 'vm';
import Plugin from './Plugin';
import manifestFromObject from './utils/manifestFromObject';
import SandboxService from './SandboxService';
const { shim } = require('lib/shim');
const { filename } = require('lib/path-utils');

// class RuntimePreferences {

// 	options_:any = {};

// 	set(path:string, value:any) {
// 		const splitted = path.split('.');
// 		let current = this.options_;

// 		for (let i = 0; i < splitted.length; i++) {
// 			const part = splitted[i];

// 			if (i === splitted.length - 1) {
// 				current[part] = value;
// 			} else {
// 				if (!(part in current)) {
// 					current[part] = {};
// 				} else {
// 					if (typeof current[part] !== 'object') throw new Error('Trying to set a sub-property on a property that is not an object');
// 				}
// 				current = current[part];
// 			}
// 		}
// 	}

// 	get(path:string, defaultValue:any = undefined):any {
// 		const splitted = path.split('.');
// 		let current = this.options_;

// 		for (let i = 0; i < splitted.length; i++) {
// 			const part = splitted[i];

// 			if (i === splitted.length - 1) {
// 				return current[part];
// 			} else {
// 				if (!(part in current)) return defaultValue;
// 				current = current[part];
// 			}
// 		}
// 	}

// }

// const runtimePreferences = new RuntimePreferences();
// export { runtimePreferences };

export default class PluginService {

	private static instance_:PluginService = null;

	public static instance():PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	public sandboxService:SandboxService;
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

		plugin.sandbox = sandbox;

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
