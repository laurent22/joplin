import * as vm from 'vm';
import { Plugin } from './utils/types';
import manifestFromObject from './utils/manifestFromObject';
import newSandbox from './newSandbox';
const { shim } = require('lib/shim');
const { filename } = require('lib/path-utils');

export default class PluginService {

	private static instance_:PluginService = null;

	public static instance():PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	private store_:any = null;

	initialize(store:any) {
		this.store_ = store;
	}

	logger() {
		return {
			error: console.error,
			info: console.info,
		};
	}

	public get plugins():Plugin[] {
		return this.store_.getState().plugins;
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

		const plugin:Plugin = {
			id: filename(path),
			manifest: manifest,
			scriptText: mainScriptContent,
			baseDir: shim.fsDriver().resolve(distPath),
			controls: {},
		};

		this.store_.dispatch({
			type: 'PLUGIN_ADD',
			plugin: plugin,
		});

		return plugin;
	}

	async loadPlugins(pluginDir:string) {
		const fsDriver = shim.fsDriver();
		const pluginPaths = await fsDriver.readDirStats(pluginDir);

		for (const stat of pluginPaths) {
			if (!stat.isDirectory()) continue;
			const plugin = await this.loadPlugin(`${pluginDir}/${stat.path}`);
			await this.runPlugin(plugin);
		}
	}

	async runPlugin(plugin:Plugin) {
		const { sandbox, context } = newSandbox(plugin, this.store_);
		vm.createContext(sandbox);
		vm.runInContext(plugin.scriptText, sandbox);

		if (context.runtime.onStart) {
			const startTime = Date.now();

			try {
				this.logger().info(`Starting plugin: ${plugin.id}`);
				await context.runtime.onStart({});
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
			throw new Error(`Plugin ${plugin.id}: The plugin was not registered! Call joplin.plugins.register({.....}) from within the plugin.`);
		}
	}

}
