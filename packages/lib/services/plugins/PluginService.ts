import Plugin from './Plugin';
import manifestFromObject from './utils/manifestFromObject';
import Global from './api/Global';
import BasePluginRunner from './BasePluginRunner';
import BaseService  from '../BaseService';
import shim from '../../shim';
const { filename, dirname } = require('../../path-utils');
const uslug = require('uslug');

interface Plugins {
	[key: string]: Plugin;
}

function makePluginId(source: string): string {
	// https://www.npmjs.com/package/slug#options
	return uslug(source).substr(0,32);
}

export default class PluginService extends BaseService {

	private static instance_: PluginService = null;

	public static instance(): PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	private store_: any = null;
	private platformImplementation_: any = null;
	private plugins_: Plugins = {};
	private runner_: BasePluginRunner = null;

	initialize(platformImplementation: any, runner: BasePluginRunner, store: any) {
		this.store_ = store;
		this.runner_ = runner;
		this.platformImplementation_ = platformImplementation;
	}

	public get plugins(): Plugins {
		return this.plugins_;
	}

	public pluginById(id: string): Plugin {
		if (!this.plugins_[id]) throw new Error(`Plugin not found: ${id}`);

		return this.plugins_[id];
	}

	private async parsePluginJsBundle(jsBundleString: string) {
		const scriptText = jsBundleString;
		const lines = scriptText.split('\n');
		const manifestText: string[] = [];

		const StateStarted = 1;
		const StateInManifest = 2;
		let state: number = StateStarted;

		for (let line of lines) {
			line = line.trim();

			if (state !== StateInManifest) {
				if (line === '/* joplin-manifest:') {
					state = StateInManifest;
				}
				continue;
			}

			if (state === StateInManifest) {
				if (line.indexOf('*/') === 0) {
					break;
				} else {
					manifestText.push(line);
				}
			}
		}

		if (!manifestText.length) throw new Error('Could not find manifest');

		return {
			scriptText: scriptText,
			manifestText: manifestText.join('\n'),
		};
	}

	public async loadPluginFromString(pluginId: string, baseDir: string, jsBundleString: string): Promise<Plugin> {
		const r = await this.parsePluginJsBundle(jsBundleString);
		return this.loadPlugin(pluginId, baseDir, r.manifestText, r.scriptText);
	}

	private async loadPluginFromPath(path: string): Promise<Plugin> {
		const fsDriver = shim.fsDriver();

		if (path.toLowerCase().endsWith('.js')) return this.loadPluginFromString(filename(path), dirname(path), await fsDriver.readFile(path));

		let distPath = path;
		if (!(await fsDriver.exists(`${distPath}/manifest.json`))) {
			distPath = `${path}/dist`;
		}

		this.logger().info(`PluginService: Loading plugin from ${path}`);

		const scriptText = await fsDriver.readFile(`${distPath}/index.js`);
		const manifestText = await fsDriver.readFile(`${distPath}/manifest.json`);
		const pluginId = makePluginId(filename(path));

		return this.loadPlugin(pluginId, distPath, manifestText, scriptText);
	}

	private async loadPlugin(pluginId: string, baseDir: string, manifestText: string, scriptText: string): Promise<Plugin> {
		const manifest = manifestFromObject(JSON.parse(manifestText));

		// After transforming the plugin path to an ID, multiple plugins might end up with the same ID. For
		// example "MyPlugin" and "myplugin" would have the same ID. Technically it's possible to have two
		// such folders but to keep things sane we disallow it.
		if (this.plugins_[pluginId]) throw new Error(`There is already a plugin with this ID: ${pluginId}`);

		const plugin = new Plugin(pluginId, baseDir, manifest, scriptText, this.logger(), (action: any) => this.store_.dispatch(action));

		this.store_.dispatch({
			type: 'PLUGIN_ADD',
			plugin: {
				id: pluginId,
				views: {},
				contentScripts: {},
			},
		});

		return plugin;
	}

	public async loadAndRunPlugins(pluginDirOrPaths: string | string[]) {
		let pluginPaths = [];

		if (Array.isArray(pluginDirOrPaths)) {
			pluginPaths = pluginDirOrPaths;
		} else {
			pluginPaths = (await shim.fsDriver().readDirStats(pluginDirOrPaths))
				.filter((stat: any) => (stat.isDirectory() || stat.path.toLowerCase().endsWith('.js')))
				.map((stat: any) => `${pluginDirOrPaths}/${stat.path}`);
		}

		for (const pluginPath of pluginPaths) {
			if (pluginPath.indexOf('_') === 0) {
				this.logger().info(`PluginService: Plugin name starts with "_" and has not been loaded: ${pluginPath}`);
				continue;
			}

			try {
				const plugin = await this.loadPluginFromPath(pluginPath);
				await this.runPlugin(plugin);
			} catch (error) {
				this.logger().error(`PluginService: Could not load plugin: ${pluginPath}`, error);
			}
		}
	}

	public async runPlugin(plugin: Plugin) {
		this.plugins_[plugin.id] = plugin;
		const pluginApi = new Global(this.logger(), this.platformImplementation_, plugin, this.store_);
		return this.runner_.run(plugin, pluginApi);
	}

}
