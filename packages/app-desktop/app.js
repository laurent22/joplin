"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@joplin/lib/services/ResourceEditWatcher/index");
const CommandService_1 = require("@joplin/lib/services/CommandService");
const KeymapService_1 = require("@joplin/lib/services/KeymapService");
const PluginService_1 = require("@joplin/lib/services/plugins/PluginService");
const reducer_1 = require("@joplin/lib/services/ResourceEditWatcher/reducer");
const PluginRunner_1 = require("./services/plugins/PluginRunner");
const PlatformImplementation_1 = require("./services/plugins/PlatformImplementation");
const shim_1 = require("@joplin/lib/shim");
const AlarmService_1 = require("@joplin/lib/services/AlarmService");
const AlarmServiceDriverNode_1 = require("@joplin/lib/services/AlarmServiceDriverNode");
const Logger_1 = require("@joplin/lib/Logger");
const Setting_1 = require("@joplin/lib/models/Setting");
const actionApi_desktop_1 = require("@joplin/lib/services/rest/actionApi.desktop");
const BaseApplication_1 = require("@joplin/lib/BaseApplication");
const DebugService_1 = require("@joplin/lib/debug/DebugService");
const locale_1 = require("@joplin/lib/locale");
const SpellCheckerService_1 = require("@joplin/lib/services/spellChecker/SpellCheckerService");
const SpellCheckerServiceDriverNative_1 = require("./services/spellChecker/SpellCheckerServiceDriverNative");
const bridge_1 = require("./services/bridge");
const menuCommandNames_1 = require("./gui/menuCommandNames");
const stateToWhenClauseContext_1 = require("./services/commands/stateToWhenClauseContext");
const ResourceService_1 = require("@joplin/lib/services/ResourceService");
const ExternalEditWatcher_1 = require("@joplin/lib/services/ExternalEditWatcher");
const app_reducer_1 = require("./app.reducer");
const { FoldersScreenUtils } = require('@joplin/lib/folders-screen-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Tag_1 = require("@joplin/lib/models/Tag");
const registry_1 = require("@joplin/lib/registry");
const packageInfo = require('./packageInfo.js');
const DecryptionWorker_1 = require("@joplin/lib/services/DecryptionWorker");
const ClipperServer_1 = require("@joplin/lib/ClipperServer");
const { webFrame } = require('electron');
const Menu = (0, bridge_1.default)().Menu;
const PluginManager = require('@joplin/lib/services/PluginManager');
const RevisionService_1 = require("@joplin/lib/services/RevisionService");
const MigrationService_1 = require("@joplin/lib/services/MigrationService");
const CssUtils_1 = require("@joplin/lib/CssUtils");
const index_2 = require("./gui/MainScreen/commands/index");
const index_3 = require("./gui/NoteEditor/commands/index");
const index_4 = require("./gui/NoteList/commands/index");
const index_5 = require("./gui/NoteListControls/commands/index");
const index_6 = require("./gui/Sidebar/commands/index");
const index_7 = require("./commands/index");
const index_8 = require("@joplin/lib/commands/index");
const os_1 = require("os");
const desktopDefaultPluginsInfo_1 = require("@joplin/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo");
const electronContextMenu = require('./services/electron-context-menu');
// import  populateDatabase from '@joplin/lib/services/debug/populateDatabase';
const commands = index_2.default
    .concat(index_3.default)
    .concat(index_4.default)
    .concat(index_5.default)
    .concat(index_6.default);
// Commands that are not tied to any particular component.
// The runtime for these commands can be loaded when the app starts.
const globalCommands = index_7.default.concat(index_8.default);
const editorCommandDeclarations_1 = require("./gui/NoteEditor/editorCommandDeclarations");
const PerFolderSortOrderService_1 = require("./services/sortOrder/PerFolderSortOrderService");
const ShareService_1 = require("@joplin/lib/services/share/ShareService");
const checkForUpdates_1 = require("./checkForUpdates");
const syncDebugLog_1 = require("@joplin/lib/services/synchronizer/syncDebugLog");
const eventManager_1 = require("@joplin/lib/eventManager");
const path = require("path");
const defaultPluginsUtils_1 = require("@joplin/lib/services/plugins/defaultPlugins/defaultPluginsUtils");
// import { runIntegrationTests } from '@joplin/lib/services/e2ee/ppkTestUtils';
const pluginClasses = [
    require('./plugins/GotoAnything').default,
];
const appDefaultState = (0, app_reducer_1.createAppDefaultState)((0, bridge_1.default)().windowContentSize(), reducer_1.defaultState);
class Application extends BaseApplication_1.default {
    constructor() {
        super();
        this.checkAllPluginStartedIID_ = null;
        this.bridge_nativeThemeUpdated = this.bridge_nativeThemeUpdated.bind(this);
    }
    hasGui() {
        return true;
    }
    reducer(state = appDefaultState, action) {
        let newState = (0, app_reducer_1.default)(state, action);
        newState = (0, reducer_1.default)(newState, action);
        newState = super.reducer(newState, action);
        return newState;
    }
    toggleDevTools(visible) {
        if (visible) {
            (0, bridge_1.default)().openDevTools();
        }
        else {
            (0, bridge_1.default)().closeDevTools();
        }
    }
    generalMiddleware(store, next, action) {
        const _super = Object.create(null, {
            generalMiddleware: { get: () => super.generalMiddleware }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'locale' || action.type === 'SETTING_UPDATE_ALL') {
                (0, locale_1.setLocale)(Setting_1.default.value('locale'));
                // The bridge runs within the main process, with its own instance of locale.js
                // so it needs to be set too here.
                (0, bridge_1.default)().setLocale(Setting_1.default.value('locale'));
            }
            if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'showTrayIcon' || action.type === 'SETTING_UPDATE_ALL') {
                this.updateTray();
            }
            if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'style.editor.fontFamily' || action.type === 'SETTING_UPDATE_ALL') {
                this.updateEditorFont();
            }
            if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'windowContentZoomFactor' || action.type === 'SETTING_UPDATE_ALL') {
                webFrame.setZoomFactor(Setting_1.default.value('windowContentZoomFactor') / 100);
            }
            if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
                yield AlarmService_1.default.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
            }
            const result = yield _super.generalMiddleware.call(this, store, next, action);
            const newState = store.getState();
            if (['NOTE_VISIBLE_PANES_TOGGLE', 'NOTE_VISIBLE_PANES_SET'].indexOf(action.type) >= 0) {
                Setting_1.default.setValue('noteVisiblePanes', newState.noteVisiblePanes);
            }
            if (['NOTE_DEVTOOLS_TOGGLE', 'NOTE_DEVTOOLS_SET'].indexOf(action.type) >= 0) {
                this.toggleDevTools(newState.devToolsVisible);
            }
            if (action.type === 'FOLDER_AND_NOTE_SELECT') {
                yield Folder_1.default.expandTree(newState.folders, action.folderId);
            }
            if (this.hasGui() && ((action.type === 'SETTING_UPDATE_ONE' && ['themeAutoDetect', 'theme', 'preferredLightTheme', 'preferredDarkTheme'].includes(action.key)) || action.type === 'SETTING_UPDATE_ALL')) {
                this.handleThemeAutoDetect();
            }
            return result;
        });
    }
    handleThemeAutoDetect() {
        if (!Setting_1.default.value('themeAutoDetect'))
            return;
        if ((0, bridge_1.default)().shouldUseDarkColors()) {
            Setting_1.default.setValue('theme', Setting_1.default.value('preferredDarkTheme'));
        }
        else {
            Setting_1.default.setValue('theme', Setting_1.default.value('preferredLightTheme'));
        }
    }
    bridge_nativeThemeUpdated() {
        this.handleThemeAutoDetect();
    }
    updateTray() {
        const app = (0, bridge_1.default)().electronApp();
        if (app.trayShown() === Setting_1.default.value('showTrayIcon'))
            return;
        if (!Setting_1.default.value('showTrayIcon')) {
            app.destroyTray();
        }
        else {
            const contextMenu = Menu.buildFromTemplate([
                { label: (0, locale_1._)('Open %s', app.electronApp().name), click: () => { app.window().show(); } },
                { type: 'separator' },
                { label: (0, locale_1._)('Quit'), click: () => { void app.quit(); } },
            ]);
            app.createTray(contextMenu);
        }
    }
    updateEditorFont() {
        const fontFamilies = [];
        if (Setting_1.default.value('style.editor.fontFamily'))
            fontFamilies.push(`"${Setting_1.default.value('style.editor.fontFamily')}"`);
        fontFamilies.push('Avenir, Arial, sans-serif');
        // The '*' and '!important' parts are necessary to make sure Russian text is displayed properly
        // https://github.com/laurent22/joplin/issues/155
        const css = `.CodeMirror * { font-family: ${fontFamilies.join(', ')} !important; }`;
        const styleTag = document.createElement('style');
        styleTag.type = 'text/css';
        styleTag.appendChild(document.createTextNode(css));
        document.head.appendChild(styleTag);
    }
    setupContextMenu() {
        // bridge().setupContextMenu((misspelledWord: string, dictionarySuggestions: string[]) => {
        // 	let output = SpellCheckerService.instance().contextMenuItems(misspelledWord, dictionarySuggestions);
        // 	console.info(misspelledWord, dictionarySuggestions);
        // 	console.info(output);
        // 	output = output.map(o => {
        // 		delete o.click;
        // 		return o;
        // 	});
        // 	return output;
        // });
        const MenuItem = (0, bridge_1.default)().MenuItem;
        // The context menu must be setup in renderer process because that's where
        // the spell checker service lives.
        electronContextMenu({
            shouldShowMenu: (_event, params) => {
                // params.inputFieldType === 'none' when right-clicking the text editor. This is a bit of a hack to detect it because in this
                // case we don't want to use the built-in context menu but a custom one.
                return params.isEditable && params.inputFieldType !== 'none';
            },
            menu: (actions, props) => {
                const spellCheckerMenuItems = SpellCheckerService_1.default.instance().contextMenuItems(props.misspelledWord, props.dictionarySuggestions).map((item) => new MenuItem(item));
                const output = [
                    actions.cut(),
                    actions.copy(),
                    actions.paste(),
                    ...spellCheckerMenuItems,
                ];
                return output;
            },
        });
    }
    checkForLegacyTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            const templatesDir = `${Setting_1.default.value('profileDir')}/templates`;
            if (yield shim_1.default.fsDriver().exists(templatesDir)) {
                try {
                    const files = yield shim_1.default.fsDriver().readDirStats(templatesDir);
                    for (const file of files) {
                        if (file.path.endsWith('.md')) {
                            // There is at least one template.
                            this.store().dispatch({
                                type: 'CONTAINS_LEGACY_TEMPLATES',
                            });
                            break;
                        }
                    }
                }
                catch (error) {
                    registry_1.reg.logger().error(`Failed to read templates directory: ${error}`);
                }
            }
        });
    }
    initPluginService() {
        return __awaiter(this, void 0, void 0, function* () {
            const service = PluginService_1.default.instance();
            const pluginRunner = new PluginRunner_1.default();
            service.initialize(packageInfo.version, PlatformImplementation_1.default.instance(), pluginRunner, this.store());
            service.isSafeMode = Setting_1.default.value('isSafeMode');
            const defaultPluginsId = Object.keys((0, desktopDefaultPluginsInfo_1.default)());
            let pluginSettings = service.unserializePluginSettings(Setting_1.default.value('plugins.states'));
            {
                // Users can add and remove plugins from the config screen at any
                // time, however we only effectively uninstall the plugin the next
                // time the app is started. What plugin should be uninstalled is
                // stored in the settings.
                const newSettings = service.clearUpdateState(yield service.uninstallPlugins(pluginSettings));
                Setting_1.default.setValue('plugins.states', newSettings);
            }
            (0, defaultPluginsUtils_1.checkPreInstalledDefaultPlugins)(defaultPluginsId, pluginSettings);
            try {
                const defaultPluginsDir = path.join((0, bridge_1.default)().buildDir(), 'defaultPlugins');
                pluginSettings = yield (0, defaultPluginsUtils_1.installDefaultPlugins)(service, defaultPluginsDir, defaultPluginsId, pluginSettings);
                if (yield shim_1.default.fsDriver().exists(Setting_1.default.value('pluginDir'))) {
                    yield service.loadAndRunPlugins(Setting_1.default.value('pluginDir'), pluginSettings);
                }
            }
            catch (error) {
                this.logger().error(`There was an error loading plugins from ${Setting_1.default.value('pluginDir')}:`, error);
            }
            try {
                if (Setting_1.default.value('plugins.devPluginPaths')) {
                    const paths = Setting_1.default.value('plugins.devPluginPaths').split(',').map((p) => p.trim());
                    yield service.loadAndRunPlugins(paths, pluginSettings, true);
                }
                // Also load dev plugins that have passed via command line arguments
                if (Setting_1.default.value('startupDevPlugins')) {
                    yield service.loadAndRunPlugins(Setting_1.default.value('startupDevPlugins'), pluginSettings, true);
                }
            }
            catch (error) {
                this.logger().error(`There was an error loading plugins from ${Setting_1.default.value('plugins.devPluginPaths')}:`, error);
            }
            {
                // Users can potentially delete files from /plugins or even delete
                // the complete folder. When that happens, we still have the plugin
                // info in the state, which can cause various issues, so to sort it
                // out we remove from the state any plugin that has *not* been loaded
                // above (meaning the file was missing).
                // https://github.com/laurent22/joplin/issues/5253
                const oldSettings = service.unserializePluginSettings(Setting_1.default.value('plugins.states'));
                const newSettings = {};
                for (const pluginId of Object.keys(oldSettings)) {
                    if (!service.pluginIds.includes(pluginId)) {
                        this.logger().warn('Found a plugin in the state that has not been loaded, which means the plugin might have been deleted outside Joplin - removing it from the state:', pluginId);
                        continue;
                    }
                    newSettings[pluginId] = oldSettings[pluginId];
                }
                Setting_1.default.setValue('plugins.states', newSettings);
            }
            this.checkAllPluginStartedIID_ = setInterval(() => {
                if (service.allPluginsStarted) {
                    clearInterval(this.checkAllPluginStartedIID_);
                    this.dispatch({
                        type: 'STARTUP_PLUGINS_LOADED',
                        value: true,
                    });
                    (0, defaultPluginsUtils_1.setSettingsForDefaultPlugins)((0, desktopDefaultPluginsInfo_1.default)());
                }
            }, 500);
        });
    }
    crashDetectionHandler() {
        // This handler conflicts with the single instance behaviour, so it's
        // not used for now.
        // https://discourse.joplinapp.org/t/pre-release-v2-8-is-now-available-updated-27-april/25158/56?u=laurent
        if (!Setting_1.default.value('wasClosedSuccessfully')) {
            const answer = confirm((0, locale_1._)('The application did not close properly. Would you like to start in safe mode?'));
            Setting_1.default.setValue('isSafeMode', !!answer);
        }
        Setting_1.default.setValue('wasClosedSuccessfully', false);
    }
    start(argv) {
        const _super = Object.create(null, {
            start: { get: () => super.start }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // If running inside a package, the command line, instead of being "node.exe <path> <flags>" is "joplin.exe <flags>" so
            // insert an extra argument so that they can be processed in a consistent way everywhere.
            if (!(0, bridge_1.default)().electronIsDev())
                argv.splice(1, 0, '.');
            argv = yield _super.start.call(this, argv);
            // this.crashDetectionHandler();
            yield this.applySettingsSideEffects();
            if (Setting_1.default.value('sync.upgradeState') === Setting_1.default.SYNC_UPGRADE_STATE_MUST_DO) {
                registry_1.reg.logger().info('app.start: doing upgradeSyncTarget action');
                (0, bridge_1.default)().window().show();
                return { action: 'upgradeSyncTarget' };
            }
            registry_1.reg.logger().info('app.start: doing regular boot');
            const dir = Setting_1.default.value('profileDir');
            syncDebugLog_1.default.enabled = false;
            if (dir.endsWith('dev-desktop-2')) {
                syncDebugLog_1.default.addTarget(Logger_1.TargetType.File, {
                    path: `${(0, os_1.homedir)()}/synclog.txt`,
                });
                syncDebugLog_1.default.enabled = true;
                syncDebugLog_1.default.info(`Profile dir: ${dir}`);
            }
            // Loads app-wide styles. (Markdown preview-specific styles loaded in app.js)
            yield (0, CssUtils_1.injectCustomStyles)('appStyles', Setting_1.default.customCssFilePath(Setting_1.default.customCssFilenames.JOPLIN_APP));
            AlarmService_1.default.setDriver(new AlarmServiceDriverNode_1.default({ appName: packageInfo.build.appId }));
            AlarmService_1.default.setLogger(registry_1.reg.logger());
            registry_1.reg.setShowErrorMessageBoxHandler((message) => { (0, bridge_1.default)().showErrorMessageBox(message); });
            if (Setting_1.default.value('flagOpenDevTools')) {
                (0, bridge_1.default)().openDevTools();
            }
            PluginManager.instance().dispatch_ = this.dispatch.bind(this);
            PluginManager.instance().setLogger(registry_1.reg.logger());
            PluginManager.instance().register(pluginClasses);
            this.initRedux();
            PerFolderSortOrderService_1.default.initialize();
            CommandService_1.default.instance().initialize(this.store(), Setting_1.default.value('env') === 'dev', stateToWhenClauseContext_1.default);
            for (const command of commands) {
                CommandService_1.default.instance().registerDeclaration(command.declaration);
            }
            for (const command of globalCommands) {
                CommandService_1.default.instance().registerDeclaration(command.declaration);
                CommandService_1.default.instance().registerRuntime(command.declaration.name, command.runtime());
            }
            for (const declaration of editorCommandDeclarations_1.default) {
                CommandService_1.default.instance().registerDeclaration(declaration);
            }
            const keymapService = KeymapService_1.default.instance();
            // We only add the commands that appear in the menu because only
            // those can have a shortcut associated with them.
            keymapService.initialize((0, menuCommandNames_1.default)());
            try {
                yield keymapService.loadCustomKeymap(`${dir}/keymap-desktop.json`);
            }
            catch (error) {
                registry_1.reg.logger().error(error);
            }
            // Since the settings need to be loaded before the store is
            // created, it will never receive the SETTING_UPDATE_ALL even,
            // which mean state.settings will not be initialised. So we
            // manually call dispatchUpdateAll() to force an update.
            Setting_1.default.dispatchUpdateAll();
            yield FoldersScreenUtils.refreshFolders();
            const tags = yield Tag_1.default.allWithNotes();
            this.dispatch({
                type: 'TAG_UPDATE_ALL',
                items: tags,
            });
            // const masterKeys = await MasterKey.all();
            // this.dispatch({
            // 	type: 'MASTERKEY_UPDATE_ALL',
            // 	items: masterKeys,
            // });
            this.store().dispatch({
                type: 'FOLDER_SELECT',
                id: Setting_1.default.value('activeFolderId'),
            });
            this.store().dispatch({
                type: 'FOLDER_SET_COLLAPSED_ALL',
                ids: Setting_1.default.value('collapsedFolderIds'),
            });
            // Loads custom Markdown preview styles
            const cssString = yield (0, CssUtils_1.loadCustomCss)(Setting_1.default.customCssFilePath(Setting_1.default.customCssFilenames.RENDERED_MARKDOWN));
            this.store().dispatch({
                type: 'CUSTOM_CSS_APPEND',
                css: cssString,
            });
            this.store().dispatch({
                type: 'NOTE_DEVTOOLS_SET',
                value: Setting_1.default.value('flagOpenDevTools'),
            });
            yield this.checkForLegacyTemplates();
            // Note: Auto-update is a misnomer in the code.
            // The code below only checks, if a new version is available.
            // We only allow Windows and macOS users to automatically check for updates
            if (shim_1.default.isWindows() || shim_1.default.isMac()) {
                const runAutoUpdateCheck = () => {
                    if (Setting_1.default.value('autoUpdateEnabled')) {
                        void (0, checkForUpdates_1.default)(true, (0, bridge_1.default)().window(), { includePreReleases: Setting_1.default.value('autoUpdate.includePreReleases') });
                    }
                };
                // Initial check on startup
                shim_1.default.setTimeout(() => { runAutoUpdateCheck(); }, 5000);
                // Then every x hours
                shim_1.default.setInterval(() => { runAutoUpdateCheck(); }, 12 * 60 * 60 * 1000);
            }
            this.updateTray();
            shim_1.default.setTimeout(() => {
                void AlarmService_1.default.garbageCollect();
            }, 1000 * 60 * 60);
            if (Setting_1.default.value('startMinimized') && Setting_1.default.value('showTrayIcon')) {
                // Keep it hidden
            }
            else {
                (0, bridge_1.default)().window().show();
            }
            void ShareService_1.default.instance().maintenance();
            ResourceService_1.default.runInBackground();
            if (Setting_1.default.value('env') === 'dev') {
                void AlarmService_1.default.updateAllNotifications();
            }
            else {
                // eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
                void registry_1.reg.scheduleSync(1000).then(() => {
                    // Wait for the first sync before updating the notifications, since synchronisation
                    // might change the notifications.
                    void AlarmService_1.default.updateAllNotifications();
                    void DecryptionWorker_1.default.instance().scheduleStart();
                });
            }
            const clipperLogger = new Logger_1.default();
            clipperLogger.addTarget(Logger_1.TargetType.File, { path: `${Setting_1.default.value('profileDir')}/log-clipper.txt` });
            clipperLogger.addTarget(Logger_1.TargetType.Console);
            ClipperServer_1.default.instance().initialize(actionApi_desktop_1.default);
            ClipperServer_1.default.instance().setLogger(clipperLogger);
            ClipperServer_1.default.instance().setDispatch(this.store().dispatch);
            if (Setting_1.default.value('clipperServer.autoStart')) {
                void ClipperServer_1.default.instance().start();
            }
            ExternalEditWatcher_1.default.instance().setLogger(registry_1.reg.logger());
            ExternalEditWatcher_1.default.instance().initialize(bridge_1.default, this.store().dispatch);
            index_1.default.instance().initialize(registry_1.reg.logger(), (action) => { this.store().dispatch(action); }, (path) => (0, bridge_1.default)().openItem(path));
            // Forwards the local event to the global event manager, so that it can
            // be picked up by the plugin manager.
            index_1.default.instance().on('resourceChange', (event) => {
                eventManager_1.default.emit('resourceChange', event);
            });
            RevisionService_1.default.instance().runInBackground();
            // Make it available to the console window - useful to call revisionService.collectRevisions()
            if (Setting_1.default.value('env') === 'dev') {
                window.joplin = {
                    revisionService: RevisionService_1.default.instance(),
                    migrationService: MigrationService_1.default.instance(),
                    decryptionWorker: DecryptionWorker_1.default.instance(),
                    commandService: CommandService_1.default.instance(),
                    pluginService: PluginService_1.default.instance(),
                    bridge: (0, bridge_1.default)(),
                    debug: new DebugService_1.default(registry_1.reg.db()),
                    resourceService: ResourceService_1.default.instance(),
                };
            }
            (0, bridge_1.default)().addEventListener('nativeThemeUpdated', this.bridge_nativeThemeUpdated);
            yield this.initPluginService();
            this.setupContextMenu();
            yield SpellCheckerService_1.default.instance().initialize(new SpellCheckerServiceDriverNative_1.default());
            // await populateDatabase(reg.db(), {
            // 	clearDatabase: true,
            // 	folderCount: 1000,
            // 	rootFolderCount: 1,
            // 	subFolderDepth: 1,
            // });
            // setTimeout(() => {
            // 	console.info(CommandService.instance().commandsToMarkdownTable(this.store().getState()));
            // }, 2000);
            // setTimeout(() => {
            // 	this.dispatch({
            // 		type: 'NAV_GO',
            // 		routeName: 'Config',
            // 		props: {
            // 			defaultSection: 'encryption',
            // 		},
            // 	});
            // }, 2000);
            // setTimeout(() => {
            // 	this.dispatch({
            // 		type: 'DIALOG_OPEN',
            // 		name: 'syncWizard',
            // 	});
            // }, 2000);
            // setTimeout(() => {
            // 	this.dispatch({
            // 		type: 'DIALOG_OPEN',
            // 		name: 'editFolder',
            // 	});
            // }, 3000);
            // setTimeout(() => {
            // 	this.dispatch({
            // 		type: 'NAV_GO',
            // 		routeName: 'Config',
            // 		props: {
            // 			defaultSection: 'plugins',
            // 		},
            // 	});
            // }, 2000);
            // await runIntegrationTests();
            return null;
        });
    }
}
let application_ = null;

//code for zooming start

let zoomLevel = 1;
let cursorX = 0;
let cursorY = 0;

const calculateCursorPosition = (event) => {
  // Get the cursor position relative to the page
  const x = event.pageX - window.pageXOffset;
  const y = event.pageY - window.pageYOffset;

  return { x, y };
};

const setTransformOrigin = (x, y) => {
  document.body.style.transformOrigin = `${x}px ${y}px`;
};

const handleWheel = (event) => {
  // Check if Ctrl/Cmd key is pressed
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault(); // Prevent page from scrolling
    const delta = Math.max(-1, Math.min(1, event.deltaY)); // Get the scroll direction
    const zoomStep = delta > 0 ? 0.95 : 1.05; // Set the zoom step

    const { x, y } = calculateCursorPosition(event);

    // Calculate the new zoom level
    const newZoomLevel = zoomLevel * zoomStep;
    const zoomFactor = newZoomLevel / zoomLevel;

    // Adjust the zoom level and page position to zoom to the cursor position
    setTransformOrigin(x, y);
    document.body.style.transform = `scale(${newZoomLevel})`;
    window.scrollTo(
      window.pageXOffset + x * (zoomFactor - 1),
      window.pageYOffset + y * (zoomFactor - 1)
    );

    zoomLevel = newZoomLevel; // Update the zoom level
    cursorX = x;
    cursorY = y;
  }
};

const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '-')) {
      event.preventDefault(); // Prevent default browser zoom behavior
      const zoomStep = event.key === '+' ? 1.05 : 0.95; // Set the zoom step
  
      const { x, y } = calculateCursorPosition(event); // Get the current cursor position
  
      // Calculate the new zoom level
      const newZoomLevel = zoomLevel * zoomStep;
      const zoomFactor = newZoomLevel / zoomLevel;
  
      // Adjust the zoom level and page position to zoom to the cursor position
      setTransformOrigin(x, y);
      document.body.style.transform = `scale(${newZoomLevel})`;
      window.scrollTo(
        window.pageXOffset + x * (zoomFactor - 1),
        window.pageYOffset + y * (zoomFactor - 1)
      );
  
      zoomLevel = newZoomLevel; // Update the zoom level
      cursorX = x; // Update the cursor position variables
      cursorY = y;
    }
  };
  

document.addEventListener('wheel', handleWheel, { passive: false }); // Add event listener
document.addEventListener('keydown', handleKeyDown); // Add event listener



//code of zooming ends

function app() {
    if (!application_)
        application_ = new Application();
    return application_;
}
exports.default = app;
//# sourceMappingURL=app.js.map