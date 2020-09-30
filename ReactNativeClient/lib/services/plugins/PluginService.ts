import Plugin from 'lib/services/plugins/Plugin';
import manifestFromObject from 'lib/services/plugins/utils/manifestFromObject';
import Sandbox from 'lib/services/plugins/Sandbox/Sandbox';
import { SandboxContext } from 'lib/services/plugins/utils/types';
// import sandboxProxy from 'lib/services/plugins/sandboxProxy';
import BasePluginRunner from 'lib/services/plugins/BasePluginRunner';
import BaseService  from '../BaseService';
const shim = require('lib/shim');
const { filename } = require('lib/path-utils');
const nodeSlug = require('slug');

interface Plugins {
	[key:string]: Plugin
}

// interface Sandboxes {
// 	[key:string]: Sandbox;
// }

function makePluginId(source:string):string {
	// https://www.npmjs.com/package/slug#options
	return nodeSlug(source, nodeSlug.defaults.modes['rfc3986']).substr(0,32);
}

export default class PluginService extends BaseService {

	private static instance_:PluginService = null;

	public static instance():PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	private store_:any = null;
	private sandboxImplementation_:any = null;
	private plugins_:Plugins = {};
	// private sandboxes_:Sandboxes = {};
	private runner_:BasePluginRunner = null;

	initialize(sandboxImplementation:any, runner:BasePluginRunner, store:any) {
		this.store_ = store;
		this.runner_ = runner;
		this.sandboxImplementation_ = sandboxImplementation;
	}

	public get plugins():Plugins {
		return this.plugins_;
	}

	public pluginById(id:string):Plugin {
		if (!this.plugins_[id]) throw new Error(`Plugin not found: ${id}`);

		return this.plugins_[id];
	}

	async loadPlugin(path:string):Promise<Plugin> {
		const fsDriver = shim.fsDriver();

		let distPath = path;
		if (!(await fsDriver.exists(`${distPath}/manifest.json`))) {
			distPath = `${path}/dist`;
		}

		this.logger().info(`PluginService: Loading plugin from ${path}`);

		const manifestPath = `${distPath}/manifest.json`;
		const indexPath = `${distPath}/index.js`;
		const manifestContent = await fsDriver.readFile(manifestPath);
		const manifest = manifestFromObject(JSON.parse(manifestContent));
		const scriptText = await fsDriver.readFile(indexPath);
		const pluginId = makePluginId(filename(path));

		// After transforming the plugin path to an ID, multiple plugins might end up with the same ID. For
		// example "MyPlugin" and "myplugin" would have the same ID. Technically it's possible to have two
		// such folders but to keep things sane we disallow it.
		if (this.plugins_[pluginId]) throw new Error(`There is already a plugin with this ID: ${pluginId}`);

		const plugin = new Plugin(pluginId, distPath, manifest, scriptText, this.logger());

		this.store_.dispatch({
			type: 'PLUGIN_ADD',
			plugin: {
				id: pluginId,
				views: {},
			},
		});

		return plugin;
	}

	async loadAndRunPlugins(pluginDirOrPaths:string | string[]) {
		let pluginPaths = [];

		if (Array.isArray(pluginDirOrPaths)) {
			pluginPaths = pluginDirOrPaths;
		} else {
			pluginPaths = (await shim.fsDriver().readDirStats(pluginDirOrPaths))
				.filter((stat:any) => stat.isDirectory())
				.map((stat:any) => `${pluginDirOrPaths}/${stat.path}`);
		}

		for (const pluginPath of pluginPaths) {
			if (pluginPath.indexOf('_') === 0) {
				this.logger().info(`PluginService: Plugin name starts with "_" and has not been loaded: ${pluginPath}`);
				continue;
			}

			try {
				const plugin = await this.loadPlugin(pluginPath);
				await this.runPlugin(plugin);
			} catch (error) {
				this.logger().error(`PluginService: Could not load plugin: ${pluginPath}`, error);
			}
		}
	}

	// cliSandbox(pluginId:string) {
	// 	let callbackId_ = 1;
	// 	const callbacks_:any = {};

	// 	function mapFunctionsToCallbacks(arg:any) {
	// 		if (Array.isArray(arg)) {
	// 			for (let i = 0; i < arg.length; i++) {
	// 				arg[i] = mapFunctionsToCallbacks(arg[i]);
	// 			}
	// 			return arg;
	// 		} else if (typeof arg === 'function') {
	// 			const id = '__event#' + callbackId_;
	// 			callbackId_++;
	// 			callbacks_[id] = arg;
	// 			return id;
	// 		} else if (arg === null) {
	// 			return null;
	// 		} else if (arg === undefined) {
	// 			return undefined;
	// 		} else if (typeof arg === 'object') {
	// 			for (const n in arg) {
	// 				arg[n] = mapFunctionsToCallbacks(arg[n]);
	// 			}
	// 		}

	// 		return arg;
	// 	}

	// 	const target = (path:string, args:any[]) => {
	// 		console.info('GOT PATH', path, mapFunctionsToCallbacks(args));
	// 		this.executeSandboxCall(pluginId, 'joplin.' + path, mapFunctionsToCallbacks(args));
	// 	};

	// 	return {
	// 		joplin: sandboxProxy(target),
	// 	}
	// }

	async runPlugin(plugin:Plugin) {
		this.plugins_[plugin.id] = plugin;

		// Context contains the data that is sent from the plugin to the app
		// Currently it only contains the object that's registered when
		// the plugin calls `joplin.plugins.register()`
		const context:SandboxContext = {
			runtime: null,
		};

		const sandbox = new Sandbox(this.sandboxImplementation_, plugin, this.store_, context);
		// this.sandboxes_[plugin.id] = sandbox;

		await this.runner_.run(plugin, sandbox);

		// const vmSandbox = vm.createContext(this.cliSandbox(plugin.id));

		// try {
		// 	vm.runInContext(plugin.scriptText, vmSandbox);
		// } catch (error) {
		// 	this.logger().error(`In plugin ${plugin.id}:`, error);
		// 	return;
		// }




		if (!context.runtime) {
			throw new Error(`Plugin ${plugin.id}: The plugin was not registered! Call joplin.plugins.register({.....}) from within the plugin.`);
		}

		if (context.runtime.onStart) {
			const startTime = Date.now();

			this.logger().info(`Starting plugin: ${plugin.id}`);

			// We don't use `await` when calling onStart because the plugin might be awaiting
			// in that call too (for example, when opening a dialog on startup) so we don't
			// want to get stuck here.
			context.runtime.onStart({}).catch((error) => {
				// For some reason, error thrown from the executed script do not have the type "Error"
				// but are instead plain object. So recreate the Error object here so that it can
				// be handled correctly by loggers, etc.
				const newError:Error = new Error(error.message);
				newError.stack = error.stack;
				this.logger().error(`In plugin ${plugin.id}:`, newError);
			}).then(() => {
				this.logger().info(`Finished running onStart handler: ${plugin.id} (Took ${Date.now() - startTime}ms)`);
			});
		}








		// vm.createContext(sandbox);

		// try {
		// 	vm.runInContext(plugin.scriptText, sandbox);
		// } catch (error) {
		// 	this.logger().error(`In plugin ${plugin.id}:`, error);
		// 	return;
		// }

		// if (!context.runtime) {
		// 	throw new Error(`Plugin ${plugin.id}: The plugin was not registered! Call joplin.plugins.register({.....}) from within the plugin.`);
		// }

		// if (context.runtime.onStart) {
		// 	const startTime = Date.now();

		// 	this.logger().info(`Starting plugin: ${plugin.id}`);

		// 	// We don't use `await` when calling onStart because the plugin might be awaiting
		// 	// in that call too (for example, when opening a dialog on startup) so we don't
		// 	// want to get stuck here.
		// 	context.runtime.onStart({}).catch((error) => {
		// 		// For some reason, error thrown from the executed script do not have the type "Error"
		// 		// but are instead plain object. So recreate the Error object here so that it can
		// 		// be handled correctly by loggers, etc.
		// 		const newError:Error = new Error(error.message);
		// 		newError.stack = error.stack;
		// 		this.logger().error(`In plugin ${plugin.id}:`, newError);
		// 	}).then(() => {
		// 		this.logger().info(`Finished running onStart handler: ${plugin.id} (Took ${Date.now() - startTime}ms)`);
		// 	});
		// }
	}

}
