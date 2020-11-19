import Plugin from './Plugin';
import manifestFromObject from './utils/manifestFromObject';
import Global from './api/Global';
import BasePluginRunner from './BasePluginRunner';
import BaseService  from '../BaseService';
import shim from '../../shim';
import { rtrimSlashes } from '../../path-utils';
import Setting from '../../models/Setting';
const compareVersions = require('compare-versions');
const { filename, dirname } = require('../../path-utils');
const uslug = require('uslug');
const md5File = require('md5-file/promise');

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

	private appVersion_: string;
	private store_: any = null;
	private platformImplementation_: any = null;
	private plugins_: Plugins = {};
	private runner_: BasePluginRunner = null;

	initialize(appVersion: string, platformImplementation: any, runner: BasePluginRunner, store: any) {
		this.appVersion_ = appVersion;
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

	// public allPluginIds(): string[] {
	// 	return Object.keys(this.plugins_);
	// }

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

	public async loadPluginFromJsBundle(baseDir: string, jsBundleString: string, pluginIdIfNotSpecified: string = ''): Promise<Plugin> {
		baseDir = rtrimSlashes(baseDir);

		const r = await this.parsePluginJsBundle(jsBundleString);
		return this.loadPlugin(baseDir, r.manifestText, r.scriptText, pluginIdIfNotSpecified);
	}

	public async loadPluginFromPackage(baseDir: string, path: string): Promise<Plugin> {
		baseDir = rtrimSlashes(baseDir);

		const fname = filename(path);
		const hash = await md5File(path);

		const unpackDir = `${Setting.value('tempDir')}/${fname}`;
		const manifestFilePath = `${unpackDir}/manifest.json`;

		let manifest: any = await this.loadManifestToObject(manifestFilePath);

		if (!manifest || manifest._package_hash !== hash) {
			await shim.fsDriver().remove(unpackDir);
			await shim.fsDriver().mkdir(unpackDir);

			await require('tar').extract({
				strict: true,
				portable: true,
				file: path,
				cwd: unpackDir,
			});

			manifest = await this.loadManifestToObject(manifestFilePath);
			if (!manifest) throw new Error(`Missing manifest file at: ${manifestFilePath}`);

			manifest._package_hash = hash;

			await shim.fsDriver().writeFile(manifestFilePath, JSON.stringify(manifest), 'utf8');
		}

		return this.loadPluginFromPath(unpackDir);
	}

	// Loads the manifest as a simple object with no validation. Used only
	// when unpacking a package.
	private async loadManifestToObject(path: string): Promise<any> {
		try {
			const manifestText = await shim.fsDriver().readFile(path, 'utf8');
			return JSON.parse(manifestText);
		} catch (error) {
			return null;
		}
	}

	private async loadPluginFromPath(path: string): Promise<Plugin> {
		path = rtrimSlashes(path);

		const fsDriver = shim.fsDriver();

		if (path.toLowerCase().endsWith('.js')) {
			return this.loadPluginFromJsBundle(dirname(path), await fsDriver.readFile(path), filename(path));
		} else if (path.toLowerCase().endsWith('.jpl')) {
			return this.loadPluginFromPackage(dirname(path), path);
		} else {
			let distPath = path;
			if (!(await fsDriver.exists(`${distPath}/manifest.json`))) {
				distPath = `${path}/dist`;
			}

			this.logger().info(`PluginService: Loading plugin from ${path}`);

			const scriptText = await fsDriver.readFile(`${distPath}/index.js`);
			const manifestText = await fsDriver.readFile(`${distPath}/manifest.json`);
			const pluginId = makePluginId(filename(path));

			return this.loadPlugin(distPath, manifestText, scriptText, pluginId);
		}
	}

	private async loadPlugin(baseDir: string, manifestText: string, scriptText: string, pluginIdIfNotSpecified: string): Promise<Plugin> {
		baseDir = rtrimSlashes(baseDir);

		const manifestObj = JSON.parse(manifestText);

		const deprecationNotices = [];

		if (!manifestObj.app_min_version) {
			manifestObj.app_min_version = '1.4';
			deprecationNotices.push('The manifest must contain an "app_min_version" key, which should be the minimum version of the app you support. It was automatically set to "1.4", but please update your manifest.json file.');
		}

		if (!manifestObj.id) {
			manifestObj.id = pluginIdIfNotSpecified;
			deprecationNotices.push(`The manifest must contain an "id" key, which should be a globally unique ID for your plugin, such as "com.example.MyPlugin" or a UUID. It was automatically set to "${manifestObj.id}", but please update your manifest.json file.`);
		}

		const manifest = manifestFromObject(manifestObj);
		const pluginId = manifest.id;

		// After transforming the plugin path to an ID, multiple plugins might end up with the same ID. For
		// example "MyPlugin" and "myplugin" would have the same ID. Technically it's possible to have two
		// such folders but to keep things sane we disallow it.
		if (this.plugins_[pluginId]) throw new Error(`There is already a plugin with this ID: ${pluginId}`);

		const plugin = new Plugin(pluginId, baseDir, manifest, scriptText, this.logger(), (action: any) => this.store_.dispatch(action));

		if (compareVersions(this.appVersion_, manifest.app_min_version) < 0) {
			this.logger().info(`PluginService: Plugin "${pluginId}" was disabled because it requires a newer version of Joplin.`, manifest);
			plugin.enabled = false;
		} else {
			this.store_.dispatch({
				type: 'PLUGIN_ADD',
				plugin: {
					id: pluginId,
					views: {},
					contentScripts: {},
				},
			});
		}

		for (const msg of deprecationNotices) {
			plugin.deprecationNotice('1.5', msg);
		}

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

	// public async handleDisabledPlugins() {
	// 	const enabledPlugins = this.allPluginIds();
	// 	const v = await this.kvStore_.value<string>('pluginService.lastEnabledPlugins');
	// 	const lastEnabledPlugins = v ? JSON.parse(v) : [];

	// 	const disabledPlugins = [];
	// 	for (const id of lastEnabledPlugins) {
	// 		if (!enabledPlugins.includes(id)) disabledPlugins.push(id);
	// 	}

	// 	await this.kvStore_.setValue('pluginService.lastEnabledPlugins', JSON.stringify(enabledPlugins));
	// }

}
