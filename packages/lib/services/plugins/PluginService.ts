import Plugin from './Plugin';
import manifestFromObject from './utils/manifestFromObject';
import Global from './api/Global';
import BasePluginRunner from './BasePluginRunner';
import BaseService from '../BaseService';
import shim from '../../shim';
import { filename, dirname, rtrimSlashes } from '../../path-utils';
import Setting from '../../models/Setting';
import Logger from '../../Logger';
import RepositoryApi from './RepositoryApi';
import produce from 'immer';
const compareVersions = require('compare-versions');
const uslug = require('@joplin/fork-uslug');

const logger = Logger.create('PluginService');

// Plugin data is split into two:
//
// - First there's the service `plugins` property, which contains the
//   plugin static data, as loaded from the plugin file or directory. For
//   example, the plugin ID, the manifest, the script files, etc.
//
// - Secondly, there's the `PluginSettings` data, which is dynamic and is
//   used for example to enable or disable a plugin. Its state is saved to
//   the user's settings.

export interface Plugins {
	[key: string]: Plugin;
}

export interface SettingAndValue {
	[settingName: string]: string;
}

export interface DefaultPluginSettings {
	version: string;
	settings?: SettingAndValue;
}

export interface DefaultPluginsInfo {
    [pluginId: string]: DefaultPluginSettings;
}

export interface PluginSetting {
	enabled: boolean;
	deleted: boolean;

	// After a plugin has been updated, the user needs to restart the app before
	// loading the new version. In the meantime, we set this property to `true`
	// so that we know the plugin has been updated. It is used for example to
	// disable the Update button.
	hasBeenUpdated: boolean;
}

export function defaultPluginSetting(): PluginSetting {
	return {
		enabled: true,
		deleted: false,
		hasBeenUpdated: false,
	};
}

export interface PluginSettings {
	[pluginId: string]: PluginSetting;
}

function makePluginId(source: string): string {
	// https://www.npmjs.com/package/slug#options
	return uslug(source).substr(0, 32);
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
	private startedPlugins_: Record<string, boolean> = {};
	private isSafeMode_ = false;

	public initialize(appVersion: string, platformImplementation: any, runner: BasePluginRunner, store: any) {
		this.appVersion_ = appVersion;
		this.store_ = store;
		this.runner_ = runner;
		this.platformImplementation_ = platformImplementation;
	}

	public get plugins(): Plugins {
		return this.plugins_;
	}

	public enabledPlugins(pluginSettings: PluginSettings): Plugins {
		const enabledPlugins = Object.fromEntries(Object.entries(this.plugins_).filter((p) => this.pluginEnabled(pluginSettings, p[0])));
		return enabledPlugins;
	}

	public get pluginIds(): string[] {
		return Object.keys(this.plugins_);
	}

	public get isSafeMode(): boolean {
		return this.isSafeMode_;
	}

	public get appVersion(): string {
		return this.appVersion_;
	}

	public set isSafeMode(v: boolean) {
		this.isSafeMode_ = v;
	}

	private setPluginAt(pluginId: string, plugin: Plugin) {
		this.plugins_ = {
			...this.plugins_,
			[pluginId]: plugin,
		};
	}

	private deletePluginAt(pluginId: string) {
		if (!this.plugins_[pluginId]) return;

		this.plugins_ = { ...this.plugins_ };
		delete this.plugins_[pluginId];
	}

	private async deletePluginFiles(plugin: Plugin) {
		await shim.fsDriver().remove(plugin.baseDir);
	}

	public pluginById(id: string): Plugin {
		if (!this.plugins_[id]) throw new Error(`Plugin not found: ${id}`);

		return this.plugins_[id];
	}

	public unserializePluginSettings(settings: any): PluginSettings {
		const output = { ...settings };

		for (const pluginId in output) {
			output[pluginId] = {
				...defaultPluginSetting(),
				...output[pluginId],
			};
		}

		return output;
	}

	public serializePluginSettings(settings: PluginSettings): any {
		return JSON.stringify(settings);
	}

	public pluginIdByContentScriptId(contentScriptId: string): string {
		for (const pluginId in this.plugins_) {
			const plugin = this.plugins_[pluginId];
			const contentScript = plugin.contentScriptById(contentScriptId);
			if (contentScript) return pluginId;
		}
		return null;
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

	public async loadPluginFromJsBundle(baseDir: string, jsBundleString: string, pluginIdIfNotSpecified: string = ''): Promise<Plugin> {
		baseDir = rtrimSlashes(baseDir);

		const r = await this.parsePluginJsBundle(jsBundleString);
		return this.loadPlugin(baseDir, r.manifestText, r.scriptText, pluginIdIfNotSpecified);
	}

	public async loadPluginFromPackage(baseDir: string, path: string): Promise<Plugin> {
		baseDir = rtrimSlashes(baseDir);

		const fname = filename(path);
		const hash = await shim.fsDriver().md5File(path);

		const unpackDir = `${Setting.value('cacheDir')}/${fname}`;
		const manifestFilePath = `${unpackDir}/manifest.json`;

		let manifest: any = await this.loadManifestToObject(manifestFilePath);

		if (!manifest || manifest._package_hash !== hash) {
			await shim.fsDriver().remove(unpackDir);
			await shim.fsDriver().mkdir(unpackDir);

			await shim.fsDriver().tarExtract({
				strict: true,
				portable: true,
				file: path,
				cwd: unpackDir,
			});

			manifest = await this.loadManifestToObject(manifestFilePath);
			if (!manifest) throw new Error(`Missing manifest file at: ${manifestFilePath}`);

			manifest._package_hash = hash;

			await shim.fsDriver().writeFile(manifestFilePath, JSON.stringify(manifest, null, '\t'), 'utf8');
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

	public async loadPluginFromPath(path: string): Promise<Plugin> {
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

			logger.info(`Loading plugin from ${path}`);

			const scriptText = await fsDriver.readFile(`${distPath}/index.js`);
			const manifestText = await fsDriver.readFile(`${distPath}/manifest.json`);
			const pluginId = makePluginId(filename(path));

			return this.loadPlugin(distPath, manifestText, scriptText, pluginId);
		}
	}

	private async loadPlugin(baseDir: string, manifestText: string, scriptText: string, pluginIdIfNotSpecified: string): Promise<Plugin> {
		baseDir = rtrimSlashes(baseDir);

		const manifestObj = JSON.parse(manifestText);

		interface DeprecationNotice {
			goneInVersion: string;
			message: string;
			isError: boolean;
		}

		const deprecationNotices: DeprecationNotice[] = [];

		if (!manifestObj.app_min_version) {
			manifestObj.app_min_version = '1.4';
			deprecationNotices.push({
				message: 'The manifest must contain an "app_min_version" key, which should be the minimum version of the app you support.',
				goneInVersion: '1.4',
				isError: true,
			});
		}

		if (!manifestObj.id) {
			manifestObj.id = pluginIdIfNotSpecified;
			deprecationNotices.push({
				message: 'The manifest must contain an "id" key, which should be a globally unique ID for your plugin, such as "com.example.MyPlugin" or a UUID.',
				goneInVersion: '1.4',
				isError: true,
			});
		}

		const manifest = manifestFromObject(manifestObj);

		const dataDir = `${Setting.value('pluginDataDir')}/${manifest.id}`;

		const plugin = new Plugin(baseDir, manifest, scriptText, (action: any) => this.store_.dispatch(action), dataDir);

		for (const notice of deprecationNotices) {
			plugin.deprecationNotice(notice.goneInVersion, notice.message, notice.isError);
		}

		// Sanity check, although at that point the plugin ID should have
		// been set, either automatically, or because it was defined in the
		// manifest.
		if (!plugin.id) throw new Error('Could not load plugin: ID is not set');

		return plugin;
	}

	private pluginEnabled(settings: PluginSettings, pluginId: string): boolean {
		if (!settings[pluginId]) return true;
		return settings[pluginId].enabled !== false;
	}

	public callStatsSummary(pluginId: string, duration: number) {
		return this.runner_.callStatsSummary(pluginId, duration);
	}

	public async loadAndRunPlugins(pluginDirOrPaths: string | string[], settings: PluginSettings, devMode: boolean = false) {
		let pluginPaths = [];

		if (Array.isArray(pluginDirOrPaths)) {
			pluginPaths = pluginDirOrPaths;
		} else {
			pluginPaths = (await shim.fsDriver().readDirStats(pluginDirOrPaths))
				.filter((stat: any) => {
					if (stat.isDirectory()) return true;
					if (stat.path.toLowerCase().endsWith('.js')) return true;
					if (stat.path.toLowerCase().endsWith('.jpl')) return true;
					return false;
				})
				.map((stat: any) => `${pluginDirOrPaths}/${stat.path}`);
		}

		for (const pluginPath of pluginPaths) {
			if (filename(pluginPath).indexOf('_') === 0) {
				logger.info(`Plugin name starts with "_" and has not been loaded: ${pluginPath}`);
				continue;
			}

			try {
				const plugin = await this.loadPluginFromPath(pluginPath);

				// After transforming the plugin path to an ID, multiple plugins might end up with the same ID. For
				// example "MyPlugin" and "myplugin" would have the same ID. Technically it's possible to have two
				// such folders but to keep things sane we disallow it.
				if (this.plugins_[plugin.id]) throw new Error(`There is already a plugin with this ID: ${plugin.id}`);

				this.setPluginAt(plugin.id, plugin);

				if (!this.pluginEnabled(settings, plugin.id)) {
					logger.info(`Not running disabled plugin: "${plugin.id}"`);
					continue;
				}

				plugin.devMode = devMode;

				await this.runPlugin(plugin);
			} catch (error) {
				logger.error(`Could not load plugin: ${pluginPath}`, error);
			}
		}
	}

	public isCompatible(pluginVersion: string): boolean {
		return compareVersions(this.appVersion_, pluginVersion) >= 0;
	}

	public get allPluginsStarted(): boolean {
		for (const pluginId of Object.keys(this.startedPlugins_)) {
			if (!this.startedPlugins_[pluginId]) return false;
		}
		return true;
	}

	public async runPlugin(plugin: Plugin) {
		if (this.isSafeMode) throw new Error(`Plugin was not started due to safe mode: ${plugin.manifest.id}`);

		if (!this.isCompatible(plugin.manifest.app_min_version)) {
			throw new Error(`Plugin "${plugin.id}" was disabled because it requires Joplin version ${plugin.manifest.app_min_version} and current version is ${this.appVersion_}.`);
		} else {
			this.store_.dispatch({
				type: 'PLUGIN_ADD',
				plugin: {
					id: plugin.id,
					views: {},
					contentScripts: {},
				},
			});
		}

		this.startedPlugins_[plugin.id] = false;

		const onStarted = () => {
			this.startedPlugins_[plugin.id] = true;
			plugin.off('started', onStarted);
		};

		plugin.on('started', onStarted);

		const pluginApi = new Global(this.platformImplementation_, plugin, this.store_);
		return this.runner_.run(plugin, pluginApi);
	}

	public async installPluginFromRepo(repoApi: RepositoryApi, pluginId: string): Promise<Plugin> {
		const pluginPath = await repoApi.downloadPlugin(pluginId);
		const plugin = await this.installPlugin(pluginPath);
		await shim.fsDriver().remove(pluginPath);
		return plugin;
	}

	public async updatePluginFromRepo(repoApi: RepositoryApi, pluginId: string): Promise<Plugin> {
		return this.installPluginFromRepo(repoApi, pluginId);
	}

	public async installPlugin(jplPath: string, loadPlugin: boolean = true): Promise<Plugin | null> {
		logger.info(`Installing plugin: "${jplPath}"`);

		// Before moving the plugin to the profile directory, we load it
		// from where it is now to check that it is valid and to retrieve
		// the plugin ID.
		const preloadedPlugin = await this.loadPluginFromPath(jplPath);
		await this.deletePluginFiles(preloadedPlugin);

		const destPath = `${Setting.value('pluginDir')}/${preloadedPlugin.id}.jpl`;
		await shim.fsDriver().copy(jplPath, destPath);

		// Now load it from the profile directory
		if (loadPlugin) {
			const plugin = await this.loadPluginFromPath(destPath);
			if (!this.plugins_[plugin.id]) this.setPluginAt(plugin.id, plugin);
			return plugin;
		} else { return null; }
	}

	private async pluginPath(pluginId: string) {
		const stats = await shim.fsDriver().readDirStats(Setting.value('pluginDir'), { recursive: false });

		for (const stat of stats) {
			if (filename(stat.path) === pluginId) {
				return `${Setting.value('pluginDir')}/${stat.path}`;
			}
		}

		return null;
	}

	public async uninstallPlugin(pluginId: string) {
		logger.info(`Uninstalling plugin: "${pluginId}"`);

		const path = await this.pluginPath(pluginId);
		if (!path) {
			// Plugin might have already been deleted
			logger.error(`Could not find plugin path to uninstall - nothing will be done: ${pluginId}`);
		} else {
			await shim.fsDriver().remove(path);
		}

		this.deletePluginAt(pluginId);
	}

	public async uninstallPlugins(settings: PluginSettings): Promise<PluginSettings> {
		let newSettings = settings;

		for (const pluginId in settings) {
			if (settings[pluginId].deleted) {
				await this.uninstallPlugin(pluginId);
				newSettings = { ...settings };
				delete newSettings[pluginId];
			}
		}

		return newSettings;
	}

	// On startup the "hasBeenUpdated" prop can be cleared since the new version
	// of the plugin has now been loaded.
	public clearUpdateState(settings: PluginSettings): PluginSettings {
		return produce(settings, (draft: PluginSettings) => {
			for (const pluginId in draft) {
				if (draft[pluginId].hasBeenUpdated) draft[pluginId].hasBeenUpdated = false;
			}
		});
	}

	public async destroy() {
		await this.runner_.waitForSandboxCalls();
	}

}
