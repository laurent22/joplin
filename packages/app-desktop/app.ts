import ResourceEditWatcher from '@joplin/lib/services/ResourceEditWatcher/index';
import CommandService from '@joplin/lib/services/CommandService';
import KeymapService from '@joplin/lib/services/KeymapService';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import resourceEditWatcherReducer, { defaultState as resourceEditWatcherDefaultState } from '@joplin/lib/services/ResourceEditWatcher/reducer';
import PluginRunner from './services/plugins/PluginRunner';
import PlatformImplementation from './services/plugins/PlatformImplementation';
import shim from '@joplin/lib/shim';
import AlarmService from '@joplin/lib/services/AlarmService';
import AlarmServiceDriverNode from '@joplin/lib/services/AlarmServiceDriverNode';
import Logger, { TargetType } from '@joplin/utils/Logger';
import Setting from '@joplin/lib/models/Setting';
import actionApi from '@joplin/lib/services/rest/actionApi.desktop';
import BaseApplication, { StartOptions } from '@joplin/lib/BaseApplication';
import DebugService from '@joplin/lib/debug/DebugService';
import { _, setLocale } from '@joplin/lib/locale';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import SpellCheckerServiceDriverNative from './services/spellChecker/SpellCheckerServiceDriverNative';
import bridge from './services/bridge';
import menuCommandNames from './gui/menuCommandNames';
import stateToWhenClauseContext from './services/commands/stateToWhenClauseContext';
import ResourceService from '@joplin/lib/services/ResourceService';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import appReducer, { createAppDefaultState } from './app.reducer';
import Folder from '@joplin/lib/models/Folder';
import Tag from '@joplin/lib/models/Tag';
import { reg } from '@joplin/lib/registry';
const packageInfo: PackageInfo = require('./packageInfo.js');
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import ClipperServer from '@joplin/lib/ClipperServer';
import { ipcRenderer, webFrame } from 'electron';
const Menu = bridge().Menu;
const PluginManager = require('@joplin/lib/services/PluginManager');
import RevisionService from '@joplin/lib/services/RevisionService';
import MigrationService from '@joplin/lib/services/MigrationService';
import { loadCustomCss, injectCustomStyles } from '@joplin/lib/CssUtils';
import mainScreenCommands from './gui/MainScreen/commands/index';
import noteEditorCommands from './gui/NoteEditor/commands/index';
import noteListCommands from './gui/NoteList/commands/index';
import noteListControlsCommands from './gui/NoteListControls/commands/index';
import sidebarCommands from './gui/Sidebar/commands/index';
import appCommands from './commands/index';
import libCommands from '@joplin/lib/commands/index';
import { homedir } from 'os';
import getDefaultPluginsInfo from '@joplin/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo';
const electronContextMenu = require('./services/electron-context-menu');
// import  populateDatabase from '@joplin/lib/services/debug/populateDatabase';

const commands = mainScreenCommands
	.concat(noteEditorCommands)
	.concat(noteListCommands)
	.concat(noteListControlsCommands)
	.concat(sidebarCommands);

// Commands that are not tied to any particular component.
// The runtime for these commands can be loaded when the app starts.
const globalCommands = appCommands.concat(libCommands);

import editorCommandDeclarations from './gui/NoteEditor/editorCommandDeclarations';
import PerFolderSortOrderService from './services/sortOrder/PerFolderSortOrderService';
import ShareService from '@joplin/lib/services/share/ShareService';
import checkForUpdates from './checkForUpdates';
import { AppState } from './app.reducer';
import syncDebugLog from '@joplin/lib/services/synchronizer/syncDebugLog';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import path = require('path');
import { afterDefaultPluginsLoaded, loadAndRunDefaultPlugins } from '@joplin/lib/services/plugins/defaultPlugins/defaultPluginsUtils';
import userFetcher, { initializeUserFetcher } from '@joplin/lib/utils/userFetcher';
import { parseNotesParent } from '@joplin/lib/reducer';
import OcrService from '@joplin/lib/services/ocr/OcrService';
import OcrDriverTesseract from '@joplin/lib/services/ocr/drivers/OcrDriverTesseract';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import { PackageInfo } from '@joplin/lib/versionInfo';
import { refreshFolders } from '@joplin/lib/folders-screen-utils';

const pluginClasses = [
	require('./plugins/GotoAnything').default,
];

const appDefaultState = createAppDefaultState(
	bridge().windowContentSize(),
	resourceEditWatcherDefaultState,
);

class Application extends BaseApplication {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private checkAllPluginStartedIID_: any = null;
	private initPluginServiceDone_ = false;
	private ocrService_: OcrService;

	public constructor() {
		super();

		this.bridge_nativeThemeUpdated = this.bridge_nativeThemeUpdated.bind(this);
	}

	public hasGui() {
		return true;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public reducer(state: AppState = appDefaultState, action: any) {
		let newState = appReducer(state, action);
		newState = resourceEditWatcherReducer(newState, action);
		newState = super.reducer(newState, action);
		return newState;
	}

	public toggleDevTools(visible: boolean) {
		if (visible) {
			bridge().openDevTools();
		} else {
			bridge().closeDevTools();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected async generalMiddleware(store: any, next: any, action: any) {
		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'locale' || action.type === 'SETTING_UPDATE_ALL') {
			setLocale(Setting.value('locale'));
			// The bridge runs within the main process, with its own instance of locale.js
			// so it needs to be set too here.
			bridge().setLocale(Setting.value('locale'));
		}

		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'showTrayIcon' || action.type === 'SETTING_UPDATE_ALL') {
			this.updateTray();
		}

		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'ocr.enabled' || action.type === 'SETTING_UPDATE_ALL') {
			this.setupOcrService();
		}

		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'style.editor.fontFamily' || action.type === 'SETTING_UPDATE_ALL') {
			this.updateEditorFont();
		}

		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'windowContentZoomFactor' || action.type === 'SETTING_UPDATE_ALL') {
			webFrame.setZoomFactor(Setting.value('windowContentZoomFactor') / 100);
		}

		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'linking.extraAllowedExtensions' || action.type === 'SETTING_UPDATE_ALL') {
			bridge().extraAllowedOpenExtensions = Setting.value('linking.extraAllowedExtensions');
		}

		if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
			await AlarmService.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
		}

		const result = await super.generalMiddleware(store, next, action);
		const newState = store.getState();

		if (['NOTE_VISIBLE_PANES_TOGGLE', 'NOTE_VISIBLE_PANES_SET'].indexOf(action.type) >= 0) {
			Setting.setValue('noteVisiblePanes', newState.noteVisiblePanes);
		}

		if (['NOTE_DEVTOOLS_TOGGLE', 'NOTE_DEVTOOLS_SET'].indexOf(action.type) >= 0) {
			this.toggleDevTools(newState.devToolsVisible);
		}

		if (action.type === 'FOLDER_AND_NOTE_SELECT') {
			await Folder.expandTree(newState.folders, action.folderId);
		}

		if (this.hasGui() && ((action.type === 'SETTING_UPDATE_ONE' && ['themeAutoDetect', 'theme', 'preferredLightTheme', 'preferredDarkTheme'].includes(action.key)) || action.type === 'SETTING_UPDATE_ALL')) {
			this.handleThemeAutoDetect();
		}

		return result;
	}

	public handleThemeAutoDetect() {
		if (!Setting.value('themeAutoDetect')) return;

		if (bridge().shouldUseDarkColors()) {
			Setting.setValue('theme', Setting.value('preferredDarkTheme'));
		} else {
			Setting.setValue('theme', Setting.value('preferredLightTheme'));
		}
	}

	private bridge_nativeThemeUpdated() {
		this.handleThemeAutoDetect();
	}

	public updateTray() {
		const app = bridge().electronApp();

		if (app.trayShown() === Setting.value('showTrayIcon')) return;

		if (!Setting.value('showTrayIcon')) {
			app.destroyTray();
		} else {
			const contextMenu = Menu.buildFromTemplate([
				{ label: _('Open %s', app.electronApp().name), click: () => { app.window().show(); } },
				{ type: 'separator' },
				{ label: _('Quit'), click: () => { void app.quit(); } },
			]);
			app.createTray(contextMenu);
		}
	}

	public updateEditorFont() {
		const fontFamilies = [];
		if (Setting.value('style.editor.fontFamily')) fontFamilies.push(`"${Setting.value('style.editor.fontFamily')}"`);
		fontFamilies.push('Avenir, Arial, sans-serif');

		// The '*' and '!important' parts are necessary to make sure Russian text is displayed properly
		// https://github.com/laurent22/joplin/issues/155
		//
		// Note: Be careful about the specificity here. Incorrect specificity can break monospaced fonts in tables.

		const css = `.CodeMirror5 *, .cm-editor .cm-content { font-family: ${fontFamilies.join(', ')} !important; }`;
		const styleTag = document.createElement('style');
		styleTag.type = 'text/css';
		styleTag.appendChild(document.createTextNode(css));
		document.head.appendChild(styleTag);
	}

	public setupContextMenu() {
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


		const MenuItem = bridge().MenuItem;

		// The context menu must be setup in renderer process because that's where
		// the spell checker service lives.
		electronContextMenu({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			shouldShowMenu: (_event: any, params: any) => {
				// params.inputFieldType === 'none' when right-clicking the text editor. This is a bit of a hack to detect it because in this
				// case we don't want to use the built-in context menu but a custom one.
				return params.isEditable && params.inputFieldType !== 'none';
			},

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			menu: (actions: any, props: any) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(props.misspelledWord, props.dictionarySuggestions).map((item: any) => new MenuItem(item));

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

	private async initPluginService() {
		if (this.initPluginServiceDone_) return;
		this.initPluginServiceDone_ = true;

		const service = PluginService.instance();

		const pluginRunner = new PluginRunner();
		service.initialize(packageInfo.version, PlatformImplementation.instance(), pluginRunner, this.store());
		service.isSafeMode = Setting.value('isSafeMode');

		let pluginSettings = service.unserializePluginSettings(Setting.value('plugins.states'));
		{
			// Users can add and remove plugins from the config screen at any
			// time, however we only effectively uninstall the plugin the next
			// time the app is started. What plugin should be uninstalled is
			// stored in the settings.
			pluginSettings = service.clearUpdateState(await service.uninstallPlugins(pluginSettings));
			Setting.setValue('plugins.states', pluginSettings);
		}

		try {
			if (await shim.fsDriver().exists(Setting.value('pluginDir'))) {
				await service.loadAndRunPlugins(Setting.value('pluginDir'), pluginSettings);
			}
		} catch (error) {
			this.logger().error(`There was an error loading plugins from ${Setting.value('pluginDir')}:`, error);
		}

		try {
			await service.loadAndRunDevPlugins(pluginSettings);
		} catch (error) {
			this.logger().error(`There was an error loading plugins from ${Setting.value('plugins.devPluginPaths')}:`, error);
		}

		// Load default plugins after loading other plugins -- this allows users
		// to override built-in plugins with development versions with the same
		// ID.
		const defaultPluginsDir = path.join(bridge().buildDir(), 'defaultPlugins');
		try {
			pluginSettings = await loadAndRunDefaultPlugins(service, defaultPluginsDir, getDefaultPluginsInfo(), pluginSettings);
		} catch (error) {
			this.logger().error(`There was an error loading plugins from ${defaultPluginsDir}:`, error);
		}

		{
			// Users can potentially delete files from /plugins or even delete
			// the complete folder. When that happens, we still have the plugin
			// info in the state, which can cause various issues, so to sort it
			// out we remove from the state any plugin that has *not* been loaded
			// above (meaning the file was missing).
			// https://github.com/laurent22/joplin/issues/5253
			const oldSettings = pluginSettings;
			const newSettings: PluginSettings = {};
			for (const pluginId of Object.keys(oldSettings)) {
				if (!service.pluginIds.includes(pluginId)) {
					this.logger().warn('Found a plugin in the state that has not been loaded, which means the plugin might have been deleted outside Joplin - removing it from the state:', pluginId);
					continue;
				}
				newSettings[pluginId] = oldSettings[pluginId];
			}
			Setting.setValue('plugins.states', newSettings);
			pluginSettings = newSettings;
		}

		this.checkAllPluginStartedIID_ = setInterval(() => {
			if (service.allPluginsStarted) {
				clearInterval(this.checkAllPluginStartedIID_);
				this.dispatch({
					type: 'STARTUP_PLUGINS_LOADED',
					value: true,
				});

				// Sends an event to the main process -- this is used by the Playwright
				// tests to wait for plugins to load.
				ipcRenderer.send('startup-plugins-loaded');

				void afterDefaultPluginsLoaded(service.plugins, getDefaultPluginsInfo(), pluginSettings);
			}
		}, 500);
	}

	public crashDetectionHandler() {
		// This handler conflicts with the single instance behaviour, so it's
		// not used for now.
		// https://discourse.joplinapp.org/t/pre-release-v2-8-is-now-available-updated-27-april/25158/56?u=laurent
		if (!Setting.value('wasClosedSuccessfully')) {
			const answer = confirm(_('The application did not close properly. Would you like to start in safe mode?'));
			Setting.setValue('isSafeMode', !!answer);
		}

		Setting.setValue('wasClosedSuccessfully', false);
	}

	private setupOcrService() {
		if (Setting.value('ocr.enabled')) {
			if (!this.ocrService_) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				const Tesseract = (window as any).Tesseract;

				const driver = new OcrDriverTesseract(
					{ createWorker: Tesseract.createWorker },
					`${bridge().buildDir()}/tesseract.js/worker.min.js`,
					`${bridge().buildDir()}/tesseract.js-core`,
				);

				this.ocrService_ = new OcrService(driver);
			}

			void this.ocrService_.runInBackground();
		} else {
			if (!this.ocrService_) return;
			void this.ocrService_.stopRunInBackground();
		}

		const handleResourceChange = () => {
			void this.ocrService_.maintenance();
		};

		eventManager.on(EventName.ResourceCreate, handleResourceChange);
		eventManager.on(EventName.ResourceChange, handleResourceChange);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async start(argv: string[], startOptions: StartOptions = null): Promise<any> {
		// If running inside a package, the command line, instead of being "node.exe <path> <flags>" is "joplin.exe <flags>" so
		// insert an extra argument so that they can be processed in a consistent way everywhere.
		if (!bridge().electronIsDev()) argv.splice(1, 0, '.');

		argv = await super.start(argv, startOptions);

		bridge().setLogFilePath(Logger.globalLogger.logFilePath());

		await this.applySettingsSideEffects();

		if (Setting.value('sync.upgradeState') === Setting.SYNC_UPGRADE_STATE_MUST_DO) {
			reg.logger().info('app.start: doing upgradeSyncTarget action');
			bridge().window().show();
			return { action: 'upgradeSyncTarget' };
		}

		reg.logger().info('app.start: doing regular boot');

		const dir: string = Setting.value('profileDir');

		syncDebugLog.enabled = false;

		if (dir.endsWith('dev-desktop-2')) {
			syncDebugLog.addTarget(TargetType.File, {
				path: `${homedir()}/synclog.txt`,
			});
			syncDebugLog.enabled = true;
			syncDebugLog.info(`Profile dir: ${dir}`);
		}

		// Loads app-wide styles. (Markdown preview-specific styles loaded in app.js)
		await injectCustomStyles('appStyles', Setting.customCssFilePath(Setting.customCssFilenames.JOPLIN_APP));

		AlarmService.setDriver(new AlarmServiceDriverNode({ appName: packageInfo.build.appId }));
		AlarmService.setLogger(reg.logger());

		reg.setShowErrorMessageBoxHandler((message: string) => { bridge().showErrorMessageBox(message); });

		if (Setting.value('flagOpenDevTools')) {
			bridge().openDevTools();
		}

		PluginManager.instance().dispatch_ = this.dispatch.bind(this);
		PluginManager.instance().setLogger(reg.logger());
		PluginManager.instance().register(pluginClasses);

		this.initRedux();

		PerFolderSortOrderService.initialize();

		CommandService.instance().initialize(this.store(), Setting.value('env') === 'dev', stateToWhenClauseContext);

		for (const command of commands) {
			CommandService.instance().registerDeclaration(command.declaration);
		}

		for (const command of globalCommands) {
			CommandService.instance().registerDeclaration(command.declaration);
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime());
		}

		for (const declaration of editorCommandDeclarations) {
			CommandService.instance().registerDeclaration(declaration);
		}

		const keymapService = KeymapService.instance();
		// We only add the commands that appear in the menu because only
		// those can have a shortcut associated with them.
		keymapService.initialize(menuCommandNames());

		try {
			await keymapService.loadCustomKeymap(`${dir}/keymap-desktop.json`);
		} catch (error) {
			reg.logger().error(error);
		}

		// Since the settings need to be loaded before the store is
		// created, it will never receive the SETTING_UPDATE_ALL even,
		// which mean state.settings will not be initialised. So we
		// manually call dispatchUpdateAll() to force an update.
		Setting.dispatchUpdateAll();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		await refreshFolders((action: any) => this.dispatch(action), '');

		const tags = await Tag.allWithNotes();

		this.dispatch({
			type: 'TAG_UPDATE_ALL',
			items: tags,
		});

		// const masterKeys = await MasterKey.all();

		// this.dispatch({
		// 	type: 'MASTERKEY_UPDATE_ALL',
		// 	items: masterKeys,
		// });

		const getNotesParent = async () => {
			let notesParent = parseNotesParent(Setting.value('notesParent'), Setting.value('activeFolderId'));
			if (notesParent.type === 'Tag' && !(await Tag.load(notesParent.selectedItemId))) {
				notesParent = {
					type: 'Folder',
					selectedItemId: Setting.value('activeFolderId'),
				};
			}
			return notesParent;
		};

		const notesParent = await getNotesParent();

		if (notesParent.type === 'SmartFilter') {
			this.store().dispatch({
				type: 'SMART_FILTER_SELECT',
				id: notesParent.selectedItemId,
			});
		} else if (notesParent.type === 'Tag') {
			this.store().dispatch({
				type: 'TAG_SELECT',
				id: notesParent.selectedItemId,
			});
		} else {
			this.store().dispatch({
				type: 'FOLDER_SELECT',
				id: notesParent.selectedItemId,
			});
		}

		this.store().dispatch({
			type: 'FOLDER_SET_COLLAPSED_ALL',
			ids: Setting.value('collapsedFolderIds'),
		});

		// Loads custom Markdown preview styles
		const cssString = await loadCustomCss(Setting.customCssFilePath(Setting.customCssFilenames.RENDERED_MARKDOWN));
		this.store().dispatch({
			type: 'CUSTOM_CSS_APPEND',
			css: cssString,
		});

		this.store().dispatch({
			type: 'NOTE_DEVTOOLS_SET',
			value: Setting.value('flagOpenDevTools'),
		});

		// Note: Auto-update is a misnomer in the code.
		// The code below only checks, if a new version is available.
		// We only allow Windows and macOS users to automatically check for updates
		if (shim.isWindows() || shim.isMac()) {
			const runAutoUpdateCheck = () => {
				if (Setting.value('autoUpdateEnabled')) {
					void checkForUpdates(true, bridge().window(), { includePreReleases: Setting.value('autoUpdate.includePreReleases') });
				}
			};

			// Initial check on startup
			shim.setTimeout(() => { runAutoUpdateCheck(); }, 5000);
			// Then every x hours
			shim.setInterval(() => { runAutoUpdateCheck(); }, 12 * 60 * 60 * 1000);
		}

		initializeUserFetcher();
		shim.setInterval(() => { void userFetcher(); }, 1000 * 60 * 60);

		this.updateTray();

		shim.setTimeout(() => {
			void AlarmService.garbageCollect();
		}, 1000 * 60 * 60);

		if (Setting.value('startMinimized') && Setting.value('showTrayIcon')) {
			bridge().window().hide();
		} else {
			bridge().window().show();
		}

		void ShareService.instance().maintenance();

		ResourceService.runInBackground();

		if (Setting.value('env') === 'dev') {
			void AlarmService.updateAllNotifications();
		} else {
			// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			void reg.scheduleSync(1000).then(() => {
				// Wait for the first sync before updating the notifications, since synchronisation
				// might change the notifications.
				void AlarmService.updateAllNotifications();

				void DecryptionWorker.instance().scheduleStart();
			});
		}

		const clipperLogger = new Logger();
		clipperLogger.addTarget(TargetType.File, { path: `${Setting.value('profileDir')}/log-clipper.txt` });
		clipperLogger.addTarget(TargetType.Console);

		ClipperServer.instance().initialize(actionApi);
		ClipperServer.instance().setLogger(clipperLogger);
		ClipperServer.instance().setDispatch(this.store().dispatch);

		if (Setting.value('clipperServer.autoStart')) {
			void ClipperServer.instance().start();
		}

		ExternalEditWatcher.instance().setLogger(reg.logger());
		ExternalEditWatcher.instance().initialize(bridge, this.store().dispatch);

		ResourceEditWatcher.instance().initialize(
			reg.logger(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			(action: any) => { this.store().dispatch(action); },
			(path: string) => bridge().openItem(path),
		);

		// Forwards the local event to the global event manager, so that it can
		// be picked up by the plugin manager.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		ResourceEditWatcher.instance().on('resourceChange', (event: any) => {
			eventManager.emit(EventName.ResourceChange, event);
		});

		RevisionService.instance().runInBackground();

		// Make it available to the console window - useful to call revisionService.collectRevisions()
		if (Setting.value('env') === 'dev') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			(window as any).joplin = {
				revisionService: RevisionService.instance(),
				migrationService: MigrationService.instance(),
				decryptionWorker: DecryptionWorker.instance(),
				commandService: CommandService.instance(),
				pluginService: PluginService.instance(),
				bridge: bridge(),
				debug: new DebugService(reg.db()),
				resourceService: ResourceService.instance(),
				searchEngine: SearchEngine.instance(),
				ocrService: () => this.ocrService_,
			};
		}

		bridge().addEventListener('nativeThemeUpdated', this.bridge_nativeThemeUpdated);
		bridge().setOnAllowedExtensionsChangeListener((newExtensions) => {
			Setting.setValue('linking.extraAllowedExtensions', newExtensions);
		});

		await this.initPluginService();

		this.setupContextMenu();

		await SpellCheckerService.instance().initialize(new SpellCheckerServiceDriverNative());

		this.startRotatingLogMaintenance(Setting.value('profileDir'));

		await this.setupOcrService();

		eventManager.on(EventName.OcrServiceResourcesProcessed, async () => {
			await ResourceService.instance().indexNoteResources();
		});

		eventManager.on(EventName.NoteResourceIndexed, async () => {
			SearchEngine.instance().scheduleSyncTables();
		});

		// setTimeout(() => {
		// 	void populateDatabase(reg.db(), {
		// 		clearDatabase: true,
		// 		folderCount: 200,
		// 		noteCount: 3000,
		// 		tagCount: 2000,
		// 		tagsPerNote: 10,
		// 		rootFolderCount: 20,
		// 		subFolderDepth: 3,
		// 	});
		// }, 5000);

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
	}

}

let application_: Application = null;

function app() {
	if (!application_) application_ = new Application();
	return application_;
}

export default app;
