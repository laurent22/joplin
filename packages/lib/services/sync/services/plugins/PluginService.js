"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPluginSetting = defaultPluginSetting;
const Plugin_1 = require("./Plugin");
const manifestFromObject_1 = require("./utils/manifestFromObject");
const Global_1 = require("./api/Global");
const BaseService_1 = require("../BaseService");
const shim_1 = require("../../shim");
const path_utils_1 = require("../../path-utils");
const Setting_1 = require("../../models/Setting");
const Logger_1 = require("@joplin/utils/Logger");
const immer_1 = require("immer");
const isCompatible_1 = require("./utils/isCompatible");
const types_1 = require("./api/types");
const minVersionForPlatform_1 = require("./utils/isCompatible/minVersionForPlatform");
const locale_1 = require("../../locale");
const uslug = require('@joplin/fork-uslug');
const logger = Logger_1.default.create('PluginService');
function defaultPluginSetting() {
    return {
        enabled: true,
        deleted: false,
        hasBeenUpdated: false,
    };
}
function makePluginId(source) {
    // https://www.npmjs.com/package/slug#options
    return uslug(source).substr(0, 32);
}
class PluginService extends BaseService_1.default {
    constructor() {
        super(...arguments);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.store_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.platformImplementation_ = null;
        this.plugins_ = {};
        this.runner_ = null;
        this.startedPlugins_ = {};
        this.isSafeMode_ = false;
        this.pluginsChangeListeners_ = [];
    }
    static instance() {
        if (!this.instance_) {
            this.instance_ = new PluginService();
        }
        return this.instance_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    initialize(appVersion, platformImplementation, runner, store) {
        this.appVersion_ = appVersion;
        this.store_ = store;
        this.runner_ = runner;
        this.platformImplementation_ = platformImplementation;
    }
    get plugins() {
        return this.plugins_;
    }
    enabledPlugins(pluginSettings) {
        const enabledPlugins = Object.fromEntries(Object.entries(this.plugins_).filter((p) => this.pluginEnabled(pluginSettings, p[0])));
        return enabledPlugins;
    }
    isPluginLoaded(pluginId) {
        return !!this.plugins_[pluginId];
    }
    get pluginIds() {
        return Object.keys(this.plugins_);
    }
    get isSafeMode() {
        return this.isSafeMode_;
    }
    get appVersion() {
        return this.appVersion_;
    }
    set isSafeMode(v) {
        this.isSafeMode_ = v;
    }
    addLoadedPluginsChangeListener(listener) {
        this.pluginsChangeListeners_.push(listener);
        return {
            remove: () => {
                this.pluginsChangeListeners_ = this.pluginsChangeListeners_.filter(l => (l !== listener));
            },
        };
    }
    dispatchPluginsChangeListeners() {
        for (const listener of this.pluginsChangeListeners_) {
            listener();
        }
    }
    setPluginAt(pluginId, plugin) {
        this.plugins_ = Object.assign(Object.assign({}, this.plugins_), { [pluginId]: plugin });
        this.dispatchPluginsChangeListeners();
    }
    deletePluginAt(pluginId) {
        if (!this.plugins_[pluginId])
            return;
        this.plugins_ = Object.assign({}, this.plugins_);
        delete this.plugins_[pluginId];
        this.dispatchPluginsChangeListeners();
    }
    async unloadPlugin(pluginId) {
        const plugin = this.plugins_[pluginId];
        if (plugin) {
            this.logger().info(`Unloading plugin ${pluginId}`);
            plugin.onUnload();
            await this.runner_.stop(plugin);
            plugin.running = false;
            this.deletePluginAt(pluginId);
            this.startedPlugins_ = Object.assign({}, this.startedPlugins_);
            delete this.startedPlugins_[pluginId];
        }
        else {
            this.logger().info(`Unable to unload plugin ${pluginId} -- already unloaded`);
        }
    }
    async deletePluginFiles(plugin) {
        await shim_1.default.fsDriver().remove(plugin.baseDir);
    }
    pluginById(id) {
        if (!this.plugins_[id])
            throw new Error(`Plugin not found: ${id}`);
        return this.plugins_[id];
    }
    safePluginNameById(id) {
        var _a, _b;
        if (!this.plugins_[id]) {
            return id;
        }
        return (_b = (_a = this.pluginById(id).manifest) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Unknown';
    }
    viewControllerByViewId(id) {
        for (const [, plugin] of Object.entries(this.plugins_)) {
            if (plugin.hasViewController(id))
                return plugin.viewController(id);
        }
        return null;
    }
    unserializePluginSettings(settings) {
        const output = Object.assign({}, settings);
        for (const pluginId in output) {
            output[pluginId] = Object.assign(Object.assign({}, defaultPluginSetting()), output[pluginId]);
        }
        return output;
    }
    serializePluginSettings(settings) {
        return settings;
    }
    pluginIdByContentScriptId(contentScriptId) {
        for (const pluginId in this.plugins_) {
            const plugin = this.plugins_[pluginId];
            const contentScript = plugin.contentScriptById(contentScriptId);
            if (contentScript)
                return pluginId;
        }
        return null;
    }
    async parsePluginJsBundle(jsBundleString) {
        const scriptText = jsBundleString;
        const lines = scriptText.split('\n');
        const manifestText = [];
        const StateStarted = 1;
        const StateInManifest = 2;
        let state = StateStarted;
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
                }
                else {
                    manifestText.push(line);
                }
            }
        }
        if (!manifestText.length)
            throw new Error('Could not find manifest');
        return {
            scriptText: scriptText,
            manifestText: manifestText.join('\n'),
        };
    }
    async loadPluginFromJsBundle(baseDir, jsBundleString, pluginIdIfNotSpecified = '') {
        baseDir = (0, path_utils_1.rtrimSlashes)(baseDir);
        const r = await this.parsePluginJsBundle(jsBundleString);
        return this.loadPlugin(baseDir, r.manifestText, r.scriptText, pluginIdIfNotSpecified);
    }
    async loadPluginFromPackage(baseDir, path) {
        baseDir = (0, path_utils_1.rtrimSlashes)(baseDir);
        const fname = (0, path_utils_1.filename)(path);
        const hash = await shim_1.default.fsDriver().md5File(path);
        const unpackDir = `${Setting_1.default.value('cacheDir')}/${fname}`;
        const manifestFilePath = `${unpackDir}/manifest.json`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let manifest = await this.loadManifestToObject(manifestFilePath);
        if (!manifest || manifest._package_hash !== hash) {
            await shim_1.default.fsDriver().remove(unpackDir);
            await shim_1.default.fsDriver().mkdir(unpackDir);
            await shim_1.default.fsDriver().tarExtract({
                strict: true,
                portable: true,
                file: path,
                cwd: unpackDir,
            });
            manifest = await this.loadManifestToObject(manifestFilePath);
            if (!manifest)
                throw new Error(`Missing manifest file at: ${manifestFilePath}`);
            manifest._package_hash = hash;
            await shim_1.default.fsDriver().writeFile(manifestFilePath, JSON.stringify(manifest, null, '\t'), 'utf8');
        }
        return this.loadPluginFromPath(unpackDir);
    }
    // Loads the manifest as a simple object with no validation. Used only
    // when unpacking a package.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async loadManifestToObject(path) {
        try {
            const manifestText = await shim_1.default.fsDriver().readFile(path, 'utf8');
            return JSON.parse(manifestText);
        }
        catch (error) {
            return null;
        }
    }
    async loadPluginFromPath(path) {
        path = (0, path_utils_1.rtrimSlashes)(path);
        const fsDriver = shim_1.default.fsDriver();
        if (path.toLowerCase().endsWith('.js')) {
            return this.loadPluginFromJsBundle((0, path_utils_1.dirname)(path), await fsDriver.readFile(path), (0, path_utils_1.filename)(path));
        }
        else if (path.toLowerCase().endsWith('.jpl')) {
            return this.loadPluginFromPackage((0, path_utils_1.dirname)(path), path);
        }
        else {
            let distPath = path;
            if (!(await fsDriver.exists(`${distPath}/manifest.json`))) {
                distPath = `${path}/dist`;
            }
            logger.info(`Loading plugin from ${path}`);
            const scriptText = await fsDriver.readFile(`${distPath}/index.js`);
            const manifestText = await fsDriver.readFile(`${distPath}/manifest.json`);
            const pluginId = makePluginId((0, path_utils_1.filename)(path));
            return this.loadPlugin(distPath, manifestText, scriptText, pluginId);
        }
    }
    async loadPlugin(baseDir, manifestText, scriptText, pluginIdIfNotSpecified) {
        baseDir = (0, path_utils_1.rtrimSlashes)(baseDir);
        const manifestObj = JSON.parse(manifestText);
        const deprecationNotices = [];
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
        const manifest = (0, manifestFromObject_1.default)(manifestObj);
        const dataDir = `${Setting_1.default.value('pluginDataDir')}/${manifest.id}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const plugin = new Plugin_1.default(baseDir, manifest, scriptText, (action) => this.store_.dispatch(action), dataDir);
        for (const notice of deprecationNotices) {
            plugin.deprecationNotice(notice.goneInVersion, notice.message, notice.isError);
        }
        // Sanity check, although at that point the plugin ID should have
        // been set, either automatically, or because it was defined in the
        // manifest.
        if (!plugin.id)
            throw new Error('Could not load plugin: ID is not set');
        return plugin;
    }
    pluginEnabled(settings, pluginId) {
        if (!settings[pluginId])
            return true;
        return settings[pluginId].enabled !== false && settings[pluginId].deleted !== true;
    }
    callStatsSummary(pluginId, duration) {
        return this.runner_.callStatsSummary(pluginId, duration);
    }
    async loadAndRunPlugins(pluginDirOrPaths, settings, options) {
        options !== null && options !== void 0 ? options : (options = {
            builtIn: false,
            devMode: false,
        });
        let pluginPaths = [];
        if (Array.isArray(pluginDirOrPaths)) {
            pluginPaths = pluginDirOrPaths;
        }
        else {
            pluginPaths = (await shim_1.default.fsDriver().readDirStats(pluginDirOrPaths))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                .filter((stat) => {
                if (stat.isDirectory())
                    return true;
                if (stat.path.toLowerCase().endsWith('.js'))
                    return true;
                if (stat.path.toLowerCase().endsWith('.jpl'))
                    return true;
                return false;
            })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                .map((stat) => `${pluginDirOrPaths}/${stat.path}`);
        }
        for (const pluginPath of pluginPaths) {
            if ((0, path_utils_1.filename)(pluginPath).indexOf('_') === 0) {
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
                        const isSameVersion = existingPlugin.manifest.version === plugin.manifest.version
                            && existingPlugin.manifest._package_hash === plugin.manifest._package_hash;
                        if (isSameVersion && existingPlugin.running === enabled) {
                            logger.debug('Not reloading same-version plugin', plugin.id);
                            continue;
                        }
                        else {
                            logger.info('Reloading plugin with ID', plugin.id);
                            await this.unloadPlugin(plugin.id);
                        }
                    }
                    else {
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
            }
            catch (error) {
                logger.error(`Could not load plugin: ${pluginPath}`, error);
            }
        }
    }
    async loadAndRunDevPlugins(settings) {
        const devPluginOptions = { devMode: true, builtIn: false };
        if (Setting_1.default.value('plugins.devPluginPaths')) {
            const paths = Setting_1.default.value('plugins.devPluginPaths').split(',').map((p) => p.trim());
            await this.loadAndRunPlugins(paths, settings, devPluginOptions);
        }
        // Also load dev plugins that have passed via command line arguments
        if (Setting_1.default.value('startupDevPlugins')) {
            await this.loadAndRunPlugins(Setting_1.default.value('startupDevPlugins'), settings, devPluginOptions);
        }
    }
    get appType_() {
        return shim_1.default.mobilePlatform() ? types_1.AppType.Mobile : types_1.AppType.Desktop;
    }
    isCompatible(manifest) {
        return (0, isCompatible_1.default)(this.appVersion_, this.appType_, manifest);
    }
    describeIncompatibility(manifest) {
        if (this.isCompatible(manifest))
            return null;
        const minVersion = (0, minVersionForPlatform_1.default)(this.appType_, manifest);
        if (minVersion) {
            return (0, locale_1._)('Please upgrade Joplin to version %s or later to use this plugin.', minVersion);
        }
        else {
            let platformDescription = 'Unknown';
            if (this.appType_ === types_1.AppType.Mobile) {
                platformDescription = (0, locale_1._)('Joplin Mobile');
            }
            else if (this.appType_ === types_1.AppType.Desktop) {
                platformDescription = (0, locale_1._)('Joplin Desktop');
            }
            return (0, locale_1._)('This plugin doesn\'t support %s.', platformDescription);
        }
    }
    get allPluginsStarted() {
        for (const pluginId of Object.keys(this.startedPlugins_)) {
            if (!this.startedPlugins_[pluginId])
                return false;
        }
        return true;
    }
    async runPlugin(plugin) {
        if (this.isSafeMode)
            throw new Error(`Plugin was not started due to safe mode: ${plugin.manifest.id}`);
        if (!this.isCompatible(plugin.manifest)) {
            throw new Error(`Plugin "${plugin.id}" was disabled: ${this.describeIncompatibility(plugin.manifest)}`);
        }
        else {
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
        const pluginApi = new Global_1.default(this.platformImplementation_, plugin, this.store_);
        return this.runner_.run(plugin, pluginApi);
    }
    async installPluginFromRepo(repoApi, pluginId) {
        const pluginPath = await repoApi.downloadPlugin(pluginId);
        const plugin = await this.installPlugin(pluginPath);
        await shim_1.default.fsDriver().remove(pluginPath);
        return plugin;
    }
    async updatePluginFromRepo(repoApi, pluginId) {
        return this.installPluginFromRepo(repoApi, pluginId);
    }
    async installPlugin(jplPath, loadPlugin = true) {
        logger.info(`Installing plugin: "${jplPath}"`);
        // Before moving the plugin to the profile directory, we load it
        // from where it is now to check that it is valid and to retrieve
        // the plugin ID.
        const preloadedPlugin = await this.loadPluginFromPath(jplPath);
        try {
            await this.deletePluginFiles(preloadedPlugin);
        }
        catch (error) {
            // Deleting the plugin appears to occasionally fail on Windows (maybe because the files
            // are still loaded?), and it prevents the plugin from being installed. Because of this
            // we just ignore the error - it means that there will be unnecessary files in the cache
            // directory, which is not a big issue.
            //
            // Ref: https://discourse.joplinapp.org/t/math-mode-plugin-no-longer-works-in-windows-v3-1-23/41853
            logger.warn('Could not delete plugin temp directory:', error);
        }
        // On mobile, it's necessary to create the plugin directory before we can copy
        // into it.
        if (!(await shim_1.default.fsDriver().exists(Setting_1.default.value('pluginDir')))) {
            logger.info(`Creating plugin directory: ${Setting_1.default.value('pluginDir')}`);
            await shim_1.default.fsDriver().mkdir(Setting_1.default.value('pluginDir'));
        }
        const destPath = `${Setting_1.default.value('pluginDir')}/${preloadedPlugin.id}.jpl`;
        await shim_1.default.fsDriver().copy(jplPath, destPath);
        // Now load it from the profile directory
        if (loadPlugin) {
            const plugin = await this.loadPluginFromPath(destPath);
            if (!this.plugins_[plugin.id])
                this.setPluginAt(plugin.id, plugin);
            return plugin;
        }
        else {
            return null;
        }
    }
    async pluginPath(pluginId) {
        const stats = await shim_1.default.fsDriver().readDirStats(Setting_1.default.value('pluginDir'), { recursive: false });
        for (const stat of stats) {
            if ((0, path_utils_1.filename)(stat.path) === pluginId) {
                return `${Setting_1.default.value('pluginDir')}/${stat.path}`;
            }
        }
        return null;
    }
    async uninstallPlugin(pluginId) {
        logger.info(`Uninstalling plugin: "${pluginId}"`);
        const path = await this.pluginPath(pluginId);
        if (!path) {
            // Plugin might have already been deleted
            logger.error(`Could not find plugin path to uninstall - nothing will be done: ${pluginId}`);
        }
        else {
            await shim_1.default.fsDriver().remove(path);
        }
        this.deletePluginAt(pluginId);
    }
    async uninstallPlugins(settings) {
        let newSettings = settings;
        for (const pluginId in settings) {
            if (settings[pluginId].deleted) {
                await this.uninstallPlugin(pluginId);
                newSettings = Object.assign({}, newSettings);
                delete newSettings[pluginId];
            }
        }
        return newSettings;
    }
    // On startup the "hasBeenUpdated" prop can be cleared since the new version
    // of the plugin has now been loaded.
    clearUpdateState(settings) {
        return (0, immer_1.produce)(settings, (draft) => {
            for (const pluginId in draft) {
                if (draft[pluginId].hasBeenUpdated)
                    draft[pluginId].hasBeenUpdated = false;
            }
        });
    }
    async destroy() {
        await this.runner_.waitForSandboxCalls();
    }
}
PluginService.instance_ = null;
exports.default = PluginService;
