import Plugin from 'lib/services/plugins/Plugin';
import manifestFromObject from 'lib/services/plugins/utils/manifestFromObject';
import Global from 'lib/services/plugins/api/Global';
import BasePluginRunner from 'lib/services/plugins/BasePluginRunner';
import BaseService  from '../BaseService';
import shim from 'lib/shim';
const { filename } = require('lib/path-utils');
const nodeSlug = require('slug');

interface Plugins {
	[key:string]: Plugin
}

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
	private platformImplementation_:any = null;
	private plugins_:Plugins = {};
	private runner_:BasePluginRunner = null;

	initialize(platformImplementation:any, runner:BasePluginRunner, store:any) {
		this.store_ = store;
		this.runner_ = runner;
		this.platformImplementation_ = platformImplementation;
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

	async runPlugin(plugin:Plugin) {
		this.plugins_[plugin.id] = plugin;
		const pluginApi = new Global(this.logger(), this.platformImplementation_, plugin, this.store_);
		return this.runner_.run(plugin, pluginApi);
	}

}
