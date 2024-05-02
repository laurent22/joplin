import Plugin from './Plugin';
import manifestFromObject from './utils/manifestFromObject';
import Global from './api/Global';
import BasePluginRunner from './BasePluginRunner';
import BaseService from '../BaseService';
import shim from '../../shim';
import { filename, dirname, rtrimSlashes } from '../../path-utils';
import Setting from '../../models/Setting';
import Logger from '@joplin/utils/Logger';
import RepositoryApi from './RepositoryApi';
import produce from 'immer';
import { PluginManifest } from './utils/types';
import isCompatible from './utils/isCompatible';
import { AppType } from './api/types';
import minVersionForPlatform from './utils/isCompatible/minVersionForPlatform';
import { _ } from '../../locale';
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
	[settingName: string]: string|number|boolean;
}

export interface DefaultPluginSettings {
	settings?: SettingAndValue;
	enabled?: boolean;
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

export type SerializedPluginSettings = Record<string, Partial<PluginSetting>>;

interface PluginLoadOptions {
	devMode: boolean;
	builtIn: boolean;
}

function makePluginId(source: string): string {
	// https://www.npmjs.com/package/slug#options
	return uslug(source).substr(0, 32);
}

type LoadedPluginsChangeListener = ()=> void;

export default class PluginService extends BaseService {

	private static instance_: PluginService = null;

	public static instance(): PluginService {
		if (!this.instance_) {
			this.instance_ = new PluginService();
		}

		return this.instance_;
	}

	private appVersion_: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private platformImplementation_: any = null;
	private plugins_: Plugins = {};
	private runner_: BasePluginRunner = null;
	private startedPlugins_: Record<string, boolean> = {};
	private isSafeMode_ = false;
	private pluginsChangeListeners_: LoadedPluginsChangeListener[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	public isPluginLoaded(pluginId: string) {
		return !!this.plugins_[pluginId];
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

	public waitForLoadedPluginsChange() {
		return new Promise<void>(resolve => {
			this.pluginsChangeListeners_.push(() => resolve());
		});
	}

	private dispatchPluginsChangeListeners() {
		for (const listener of this.pluginsChangeListeners_) {
			listener();
		}
		this.pluginsChangeListeners_ = [];
	}

	private setPluginAt(pluginId: string, plugin: Plugin) {
		this.plugins_ = {
			...this.plugins_,
			[pluginId]: plugin,
		};
		this.dispatchPluginsChangeListeners();
	}

	private deletePluginAt(pluginId: string) {
		if (!this.plugins_[pluginId]) return;

		this.plugins_ = { ...this.plugins_ };
		delete this.plugins_[pluginId];

		this.dispatchPluginsChangeListeners();
	}

	public async unloadPlugin(pluginId: string) {
		const plugin = this.plugins_[pluginId];
		if (plugin) {
			this.logger().info(`Unloading plugin ${pluginId}`);

			plugin.onUnload();
			await this.runner_.stop(plugin);
			plugin.running = false;

			this.deletePluginAt(pluginId);
			this.startedPlugins_ = { ...this.startedPlugins_ };
			delete this.startedPlugins_[pluginId];
		} else {
			this.logger().info(`Unable to unload plugin ${pluginId} -- already unloaded`);
		}
	}

	private async deletePluginFiles(plugin: Plugin) {
		await shim.fsDriver().remove(plugin.baseDir);
	}

	public pluginById(id: string): Plugin {
		if (!this.plugins_[id]) throw new Error(`Plugin not found: ${id}`);

		return this.plugins_[id];
	}

	public unserializePluginSettings(settings: SerializedPluginSettings): PluginSettings {
		const output = { ...settings };

		for (const pluginId in output) {
			output[pluginId] = {
				...defaultPluginSetting(),
				...output[pluginId],
			};
		}

		return output as PluginSettings;
	}

	public serializePluginSettings(settings: PluginSettings): string {
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

	public async loadPluginFromJsBundle(baseDir: string, jsBundleString: string, pluginIdIfNotSpecified = ''): Promise<Plugin> {
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		return settings[pluginId].enabled !== false && settings[pluginId].deleted !== true;
	}

	public callStatsSummary(pluginId: string, duration: number) {
		return this.runner_.callStatsSummary(pluginId, duration);
	}

	public async loadAndRunPlugins(
		pluginDirOrPaths: string | string[], settings: PluginSettings, options?: PluginLoadOptions,
	) {
		options ??= {
			builtIn: false,
			devMode: false,
		};

		let pluginPaths = [];

		if (Array.isArray(pluginDirOrPaths)) {
			pluginPaths = pluginDirOrPaths;
		} else {
			pluginPaths = (await shim.fsDriver().readDirStats(pluginDirOrPaths))
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.filter((stat: any) => {
					if (stat.isDirectory()) return true;
					if (stat.path.toLowerCase().endsWith('.js')) return true;
					if (stat.path.toLowerCase().endsWith('.jpl')) return true;
					return false;
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.map((stat: any) => `${pluginDirOrPaths}/${stat.path}`);
		}

		for (const pluginPath of pluginPaths) {
			if (filename(pluginPath).indexOf('_') === 0) {
				logger.info(`Plugin name starts with "_" and has not been loaded: ${pluginPath}`);
				continue;
			}

			try {
				const plugin = await this.loadPluginFromPath(pluginPath);
				const enabled = this.pluginEnabled(settings, plugin.id);

				const existingPlugin = this.plugins_[plugin.id];
				if (existingPlugin) {
					const isSamePlugin = existingPlugin.baseDir === plugin.baseDir;

					// On mobile, plugins can reload without restarting the app. If a plugin is currently
					// running and hasn't changed, it doesn't need to be reloaded.
					if (isSamePlugin) {
						const isSameVersion =
							existingPlugin.manifest.version === plugin.manifest.version
							&& existingPlugin.manifest._package_hash === plugin.manifest._package_hash;
						if (isSameVersion && existingPlugin.running === enabled) {
							logger.debug('Not reloading same-version plugin', plugin.id);
							continue;
						} else {
							logger.info('Reloading plugin with ID', plugin.id);
							await this.unloadPlugin(plugin.id);
						}
					} else {
						// After transforming the plugin path to an ID, multiple plugins might end up with the same ID. For
						// example "MyPlugin" and "myplugin" would have the same ID. Technically it's possible to have two
						// such folders but to keep things sane we disallow it.
						throw new Error(`There is already a plugin with this ID: ${plugin.id}`);
					}
				}

				// We mark the plugin as built-in even if not enabled (being built-in affects
				// update UI).
				plugin.builtIn = options.builtIn;

				this.setPluginAt(plugin.id, plugin);

				if (!enabled) {
					logger.info(`Not running disabled plugin: "${plugin.id}"`);
					continue;
				}

				plugin.devMode = options.devMode;

				await this.runPlugin(plugin);
			} catch (error) {
				logger.error(`Could not load plugin: ${pluginPath}`, error);
			}
		}
	}

	public async loadAndRunDevPlugins(settings: PluginSettings) {
		const devPluginOptions = { devMode: true, builtIn: false };

		if (Setting.value('plugins.devPluginPaths')) {
			const paths = Setting.value('plugins.devPluginPaths').split(',').map((p: string) => p.trim());
			await this.loadAndRunPlugins(paths, settings, devPluginOptions);
		}

		// Also load dev plugins that have passed via command line arguments
		if (Setting.value('startupDevPlugins')) {
			await this.loadAndRunPlugins(Setting.value('startupDevPlugins'), settings, devPluginOptions);
		}
	}

	private get appType_() {
		return shim.mobilePlatform() ? AppType.Mobile : AppType.Desktop;
	}

	public isCompatible(manifest: PluginManifest): boolean {
		return isCompatible(this.appVersion_, this.appType_, manifest);
	}

	public describeIncompatibility(manifest: PluginManifest) {
		if (this.isCompatible(manifest)) return null;

		const minVersion = minVersionForPlatform(this.appType_, manifest);
		if (minVersion) {
			return _('Please upgrade Joplin to version %s or later to use this plugin.', minVersion);
		} else {
			let platformDescription = 'Unknown';
			if (this.appType_ === AppType.Mobile) {
				platformDescription = _('Joplin Mobile');
			} else if (this.appType_ === AppType.Desktop) {
				platformDescription = _('Joplin Desktop');
			}
			return _('This plugin doesn\'t support %s.', platformDescription);
		}
	}

	public get allPluginsStarted(): boolean {
		for (const pluginId of Object.keys(this.startedPlugins_)) {
			if (!this.startedPlugins_[pluginId]) return false;
		}
		return true;
	}

	public async runPlugin(plugin: Plugin) {
		if (this.isSafeMode) throw new Error(`Plugin was not started due to safe mode: ${plugin.manifest.id}`);

		if (!this.isCompatible(plugin.manifest)) {
			throw new Error(`Plugin "${plugin.id}" was disabled: ${this.describeIncompatibility(plugin.manifest)}`);
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

		plugin.running = true;
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

	public async installPlugin(jplPath: string, loadPlugin = true): Promise<Plugin | null> {
		logger.info(`Installing plugin: "${jplPath}"`);

		// Before moving the plugin to the profile directory, we load it
		// from where it is now to check that it is valid and to retrieve
		// the plugin ID.
		const preloadedPlugin = await this.loadPluginFromPath(jplPath);
		await this.deletePluginFiles(preloadedPlugin);

		// On mobile, it's necessary to create the plugin directory before we can copy
		// into it.
		if (!(await shim.fsDriver().exists(Setting.value('pluginDir')))) {
			logger.info(`Creating plugin directory: ${Setting.value('pluginDir')}`);
			await shim.fsDriver().mkdir(Setting.value('pluginDir'));
		}

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
				newSettings = { ...newSettings };
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
