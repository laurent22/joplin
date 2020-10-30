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
const setUpQuickActions_1 = require("./setUpQuickActions");
const PluginAssetsLoader_1 = require("./PluginAssetsLoader");
const reducer_1 = require("lib/reducer");
const AlarmService_1 = require("lib/services/AlarmService");
const AlarmServiceDriver_ios_1 = require("lib/services/AlarmServiceDriver.ios");
const Alarm_1 = require("lib/models/Alarm");
const Logger_1 = require("lib/Logger");
const BaseService_1 = require("lib/services/BaseService");
const Note_1 = require("lib/components/screens/Note");
const UpgradeSyncTargetScreen_1 = require("lib/components/screens/UpgradeSyncTargetScreen");
const Setting_1 = require("lib/models/Setting");
const PoorManIntervals_1 = require("lib/PoorManIntervals");
const ShareExtension_1 = require("lib/ShareExtension");
const shareHandler_1 = require("lib/shareHandler");
const uuid_1 = require("lib/uuid");
const KeychainServiceDriver_mobile_1 = require("lib/services/keychain/KeychainServiceDriver.mobile");
const shim_1 = require("lib/shim");
const PluginService_1 = require("lib/services/plugins/PluginService");
const PluginRunner_1 = require("./services/plugins/PluginRunner");
const React = require('react');
const { AppState, Keyboard, NativeModules, BackHandler, Animated, View, StatusBar } = require('react-native');
const SafeAreaView = require('lib/components/SafeAreaView');
const { connect, Provider } = require('react-redux');
const { BackButtonService } = require('lib/services/back-button.js');
const NavService = require('lib/services/NavService.js');
const { createStore, applyMiddleware } = require('redux');
const reduxSharedMiddleware = require('lib/components/shared/reduxSharedMiddleware');
const { shimInit } = require('lib/shim-init-react.js');
const { time } = require('lib/time-utils.js');
const { AppNav } = require('lib/components/app-nav.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const Resource = require('lib/models/Resource.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const BaseItem = require('lib/models/BaseItem.js');
const MasterKey = require('lib/models/MasterKey.js');
const Revision = require('lib/models/Revision.js');
const BaseModel = require('lib/BaseModel.js');
const ResourceService = require('lib/services/ResourceService');
const RevisionService = require('lib/services/RevisionService');
const KvStore = require('lib/services/KvStore');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { Database } = require('lib/database.js');
const { NotesScreen } = require('lib/components/screens/notes.js');
const { TagsScreen } = require('lib/components/screens/tags.js');
const { ConfigScreen } = require('lib/components/screens/config.js');
const { FolderScreen } = require('lib/components/screens/folder.js');
const { LogScreen } = require('lib/components/screens/log.js');
const { StatusScreen } = require('lib/components/screens/status.js');
const { SearchScreen } = require('lib/components/screens/search.js');
const { OneDriveLoginScreen } = require('lib/components/screens/onedrive-login.js');
const { EncryptionConfigScreen } = require('lib/components/screens/encryption-config.js');
const { DropboxLoginScreen } = require('lib/components/screens/dropbox-login.js');
const { MenuContext } = require('react-native-popup-menu');
const { SideMenu } = require('lib/components/side-menu.js');
const { SideMenuContent } = require('lib/components/side-menu-content.js');
const { SideMenuContentNote } = require('lib/components/side-menu-content-note.js');
const { DatabaseDriverReactNative } = require('lib/database-driver-react-native');
const { reg } = require('lib/registry.js');
const { setLocale, closestSupportedLocale, defaultLocale } = require('lib/locale');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const RNFetchBlob = require('rn-fetch-blob').default;
const DropdownAlert = require('react-native-dropdownalert').default;
const ResourceFetcher = require('lib/services/ResourceFetcher');
const SearchEngine = require('lib/services/searchengine/SearchEngine');
const WelcomeUtils = require('lib/WelcomeUtils');
const { themeStyle } = require('lib/components/global-style.js');
const { loadKeychainServiceAndSettings } = require('lib/services/SettingUtils');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const SyncTargetFilesystem = require('lib/SyncTargetFilesystem.js');
const SyncTargetNextcloud = require('lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('lib/SyncTargetWebDAV.js');
const SyncTargetDropbox = require('lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('lib/SyncTargetAmazonS3.js');
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
const FsDriverRN = require('lib/fs-driver-rn.js').FsDriverRN;
const DecryptionWorker = require('lib/services/DecryptionWorker');
const EncryptionService = require('lib/services/EncryptionService');
const MigrationService = require('lib/services/MigrationService');
const DEFAULT_ROUTE = {
    type: 'NAV_GO',
    routeName: 'Notes',
    smartFilterId: 'c3176726992c11e9ac940492261af972',
};
const appDefaultState = Object.assign(Object.assign({}, reducer_1.defaultState), { sideMenuOpenPercent: 0, route: DEFAULT_ROUTE, noteSelectionEnabled: false, noteSideMenuOptions: null });
let storeDispatch = function (_action) { };
const logReducerAction = function (action) {
    if (['SIDE_MENU_OPEN_PERCENT', 'SYNC_REPORT_UPDATE'].indexOf(action.type) >= 0)
        return;
    const msg = [action.type];
    if (action.routeName)
        msg.push(action.routeName);
    // reg.logger().debug('Reducer action', msg.join(', '));
};
const generalMiddleware = (store) => (next) => (action) => __awaiter(void 0, void 0, void 0, function* () {
    logReducerAction(action);
    PoorManIntervals_1.default.update(); // This function needs to be called regularly so put it here
    const result = next(action);
    const newState = store.getState();
    yield reduxSharedMiddleware(store, next, action);
    if (action.type == 'NAV_GO')
        Keyboard.dismiss();
    if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
        if (!(yield reg.syncTarget().syncStarted()))
            reg.scheduleSync(5 * 1000, { syncSteps: ['update_remote', 'delete_remote'] });
        SearchEngine.instance().scheduleSyncTables();
    }
    if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
        yield AlarmService_1.default.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
    }
    if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'sync.interval' || action.type == 'SETTING_UPDATE_ALL') {
        reg.setupRecurrentSync();
    }
    if ((action.type == 'SETTING_UPDATE_ONE' && (action.key == 'dateFormat' || action.key == 'timeFormat')) || (action.type == 'SETTING_UPDATE_ALL')) {
        time.setDateFormat(Setting_1.default.value('dateFormat'));
        time.setTimeFormat(Setting_1.default.value('timeFormat'));
    }
    if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'locale' || action.type == 'SETTING_UPDATE_ALL') {
        setLocale(Setting_1.default.value('locale'));
    }
    if ((action.type == 'SETTING_UPDATE_ONE' && (action.key.indexOf('encryption.') === 0)) || (action.type == 'SETTING_UPDATE_ALL')) {
        yield EncryptionService.instance().loadMasterKeysFromSettings();
        DecryptionWorker.instance().scheduleStart();
        const loadedMasterKeyIds = EncryptionService.instance().loadedMasterKeyIds();
        storeDispatch({
            type: 'MASTERKEY_REMOVE_NOT_LOADED',
            ids: loadedMasterKeyIds,
        });
        // Schedule a sync operation so that items that need to be encrypted
        // are sent to sync target.
        reg.scheduleSync();
    }
    if (action.type == 'NAV_GO' && action.routeName == 'Notes') {
        Setting_1.default.setValue('activeFolderId', newState.selectedFolderId);
    }
    if (action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
        DecryptionWorker.instance().scheduleStart();
    }
    if (action.type === 'SYNC_CREATED_OR_UPDATED_RESOURCE') {
        ResourceFetcher.instance().autoAddResources();
    }
    return result;
});
const navHistory = [];
function historyCanGoBackTo(route) {
    if (route.routeName === 'Note')
        return false;
    if (route.routeName === 'Folder')
        return false;
    // There's no point going back to these screens in general and, at least in OneDrive case,
    // it can be buggy to do so, due to incorrectly relying on global state (reg.syncTarget...)
    if (route.routeName === 'OneDriveLogin')
        return false;
    if (route.routeName === 'DropboxLogin')
        return false;
    return true;
}
const appReducer = (state = appDefaultState, action) => {
    let newState = state;
    let historyGoingBack = false;
    try {
        switch (action.type) {
            // @ts-ignore
            case 'NAV_BACK':
                {
                    if (!navHistory.length)
                        break;
                    let newAction = null;
                    while (navHistory.length) {
                        newAction = navHistory.pop();
                        if (newAction.routeName != state.route.routeName)
                            break;
                    }
                    action = newAction ? newAction : navHistory.pop();
                    historyGoingBack = true;
                }
            // Fall throught
            case 'NAV_GO':
                {
                    const currentRoute = state.route;
                    if (!historyGoingBack && historyCanGoBackTo(currentRoute)) {
                        // If the route *name* is the same (even if the other parameters are different), we
                        // overwrite the last route in the history with the current one. If the route name
                        // is different, we push a new history entry.
                        if (currentRoute.routeName == action.routeName) {
                            // nothing
                        }
                        else {
                            navHistory.push(currentRoute);
                        }
                    }
                    // HACK: whenever a new screen is loaded, all the previous screens of that type
                    // are overwritten with the new screen parameters. This is because the way notes
                    // are currently loaded is not optimal (doesn't retain history properly) so
                    // this is a simple fix without doing a big refactoring to change the way notes
                    // are loaded. Might be good enough since going back to different folders
                    // is probably not a common workflow.
                    for (let i = 0; i < navHistory.length; i++) {
                        const n = navHistory[i];
                        if (n.routeName == action.routeName) {
                            navHistory[i] = Object.assign({}, action);
                        }
                    }
                    newState = Object.assign({}, state);
                    newState.selectedNoteHash = '';
                    if ('noteId' in action) {
                        newState.selectedNoteIds = action.noteId ? [action.noteId] : [];
                    }
                    if ('folderId' in action) {
                        newState.selectedFolderId = action.folderId;
                        newState.notesParentType = 'Folder';
                    }
                    if ('tagId' in action) {
                        newState.selectedTagId = action.tagId;
                        newState.notesParentType = 'Tag';
                    }
                    if ('smartFilterId' in action) {
                        newState.selectedSmartFilterId = action.smartFilterId;
                        newState.notesParentType = 'SmartFilter';
                    }
                    if ('itemType' in action) {
                        newState.selectedItemType = action.itemType;
                    }
                    if ('noteHash' in action) {
                        newState.selectedNoteHash = action.noteHash;
                    }
                    if ('sharedData' in action) {
                        newState.sharedData = action.sharedData;
                    }
                    else {
                        newState.sharedData = null;
                    }
                    newState.route = action;
                    newState.historyCanGoBack = !!navHistory.length;
                }
                break;
            case 'SIDE_MENU_TOGGLE':
                newState = Object.assign({}, state);
                newState.showSideMenu = !newState.showSideMenu;
                break;
            case 'SIDE_MENU_OPEN':
                newState = Object.assign({}, state);
                newState.showSideMenu = true;
                break;
            case 'SIDE_MENU_CLOSE':
                newState = Object.assign({}, state);
                newState.showSideMenu = false;
                break;
            case 'SIDE_MENU_OPEN_PERCENT':
                newState = Object.assign({}, state);
                newState.sideMenuOpenPercent = action.value;
                break;
            case 'NOTE_SELECTION_TOGGLE':
                {
                    newState = Object.assign({}, state);
                    const noteId = action.id;
                    const newSelectedNoteIds = state.selectedNoteIds.slice();
                    const existingIndex = state.selectedNoteIds.indexOf(noteId);
                    if (existingIndex >= 0) {
                        newSelectedNoteIds.splice(existingIndex, 1);
                    }
                    else {
                        newSelectedNoteIds.push(noteId);
                    }
                    newState.selectedNoteIds = newSelectedNoteIds;
                    newState.noteSelectionEnabled = !!newSelectedNoteIds.length;
                }
                break;
            case 'NOTE_SELECTION_START':
                if (!state.noteSelectionEnabled) {
                    newState = Object.assign({}, state);
                    newState.noteSelectionEnabled = true;
                    newState.selectedNoteIds = [action.id];
                }
                break;
            case 'NOTE_SELECTION_END':
                newState = Object.assign({}, state);
                newState.noteSelectionEnabled = false;
                newState.selectedNoteIds = [];
                break;
            case 'NOTE_SIDE_MENU_OPTIONS_SET':
                newState = Object.assign({}, state);
                newState.noteSideMenuOptions = action.options;
                break;
        }
    }
    catch (error) {
        error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
        throw error;
    }
    return reducer_1.default(newState, action);
};
const store = createStore(appReducer, applyMiddleware(generalMiddleware));
storeDispatch = store.dispatch;
function resourceFetcher_downloadComplete(event) {
    if (event.encrypted) {
        DecryptionWorker.instance().scheduleStart();
    }
}
function decryptionWorker_resourceMetadataButNotBlobDecrypted() {
    ResourceFetcher.instance().scheduleAutoAddResources();
}
function initialize(dispatch) {
    return __awaiter(this, void 0, void 0, function* () {
        shimInit();
        Setting_1.default.setConstant('env', __DEV__ ? 'dev' : 'prod');
        Setting_1.default.setConstant('appId', 'net.cozic.joplin-mobile');
        Setting_1.default.setConstant('appType', 'mobile');
        Setting_1.default.setConstant('resourceDir', RNFetchBlob.fs.dirs.DocumentDir);
        Setting_1.default.setConstant('pluginDir', Setting_1.default.value('resourceDir') + '/plugins');
        const logDatabase = new Database(new DatabaseDriverReactNative());
        yield logDatabase.open({ name: 'log.sqlite' });
        yield logDatabase.exec(Logger_1.default.databaseCreateTableSql());
        const mainLogger = new Logger_1.default();
        mainLogger.addTarget(Logger_1.TargetType.Database, { database: logDatabase, source: 'm' });
        mainLogger.setLevel(Logger_1.default.LEVEL_INFO);
        if (Setting_1.default.value('env') == 'dev') {
            mainLogger.addTarget(Logger_1.TargetType.Console);
            mainLogger.setLevel(Logger_1.default.LEVEL_DEBUG);
        }
        reg.setLogger(mainLogger);
        reg.setShowErrorMessageBoxHandler((message) => { alert(message); });
        BaseService_1.default.logger_ = mainLogger;
        // require('lib/ntpDate').setLogger(reg.logger());
        reg.logger().info('====================================');
        reg.logger().info(`Starting application ${Setting_1.default.value('appId')} (${Setting_1.default.value('env')})`);
        const dbLogger = new Logger_1.default();
        dbLogger.addTarget(Logger_1.TargetType.Database, { database: logDatabase, source: 'm' });
        if (Setting_1.default.value('env') == 'dev') {
            dbLogger.addTarget(Logger_1.TargetType.Console);
            dbLogger.setLevel(Logger_1.default.LEVEL_INFO); // Set to LEVEL_DEBUG for full SQL queries
        }
        else {
            dbLogger.setLevel(Logger_1.default.LEVEL_INFO);
        }
        const db = new JoplinDatabase(new DatabaseDriverReactNative());
        db.setLogger(dbLogger);
        reg.setDb(db);
        reg.dispatch = dispatch;
        BaseModel.dispatch = dispatch;
        FoldersScreenUtils.dispatch = dispatch;
        BaseSyncTarget.dispatch = dispatch;
        NavService.dispatch = dispatch;
        BaseModel.setDb(db);
        KvStore.instance().setDb(reg.db());
        BaseItem.loadClass('Note', Note);
        BaseItem.loadClass('Folder', Folder);
        BaseItem.loadClass('Resource', Resource);
        BaseItem.loadClass('Tag', Tag);
        BaseItem.loadClass('NoteTag', NoteTag);
        BaseItem.loadClass('MasterKey', MasterKey);
        BaseItem.loadClass('Revision', Revision);
        const fsDriver = new FsDriverRN();
        Resource.fsDriver_ = fsDriver;
        FileApiDriverLocal.fsDriver_ = fsDriver;
        AlarmService_1.default.setDriver(new AlarmServiceDriver_ios_1.default(mainLogger));
        AlarmService_1.default.setLogger(mainLogger);
        try {
            if (Setting_1.default.value('env') == 'prod') {
                yield db.open({ name: 'joplin.sqlite' });
            }
            else {
                yield db.open({ name: 'joplin-76.sqlite' });
                // await db.clearForTesting();
            }
            reg.logger().info('Database is ready.');
            reg.logger().info('Loading settings...');
            yield loadKeychainServiceAndSettings(KeychainServiceDriver_mobile_1.default);
            if (!Setting_1.default.value('clientId'))
                Setting_1.default.setValue('clientId', uuid_1.default.create());
            if (Setting_1.default.value('firstStart')) {
                let locale = NativeModules.I18nManager.localeIdentifier;
                if (!locale)
                    locale = defaultLocale();
                Setting_1.default.setValue('locale', closestSupportedLocale(locale));
                Setting_1.default.setValue('firstStart', 0);
            }
            if (Setting_1.default.value('db.ftsEnabled') === -1) {
                const ftsEnabled = yield db.ftsEnabled();
                Setting_1.default.setValue('db.ftsEnabled', ftsEnabled ? 1 : 0);
                reg.logger().info('db.ftsEnabled = ', Setting_1.default.value('db.ftsEnabled'));
            }
            if (Setting_1.default.value('env') === 'dev') {
                Setting_1.default.setValue('welcome.enabled', false);
            }
            PluginAssetsLoader_1.default.instance().setLogger(mainLogger);
            yield PluginAssetsLoader_1.default.instance().importAssets();
            // eslint-disable-next-line require-atomic-updates
            BaseItem.revisionService_ = RevisionService.instance();
            // Note: for now we hard-code the folder sort order as we need to
            // create a UI to allow customisation (started in branch mobile_add_sidebar_buttons)
            Setting_1.default.setValue('folders.sortOrder.field', 'title');
            Setting_1.default.setValue('folders.sortOrder.reverse', false);
            reg.logger().info(`Sync target: ${Setting_1.default.value('sync.target')}`);
            setLocale(Setting_1.default.value('locale'));
            // ----------------------------------------------------------------
            // E2EE SETUP
            // ----------------------------------------------------------------
            EncryptionService.fsDriver_ = fsDriver;
            EncryptionService.instance().setLogger(mainLogger);
            // eslint-disable-next-line require-atomic-updates
            BaseItem.encryptionService_ = EncryptionService.instance();
            DecryptionWorker.instance().dispatch = dispatch;
            DecryptionWorker.instance().setLogger(mainLogger);
            DecryptionWorker.instance().setKvStore(KvStore.instance());
            DecryptionWorker.instance().setEncryptionService(EncryptionService.instance());
            yield EncryptionService.instance().loadMasterKeysFromSettings();
            DecryptionWorker.instance().on('resourceMetadataButNotBlobDecrypted', decryptionWorker_resourceMetadataButNotBlobDecrypted);
            // ----------------------------------------------------------------
            // / E2EE SETUP
            // ----------------------------------------------------------------
            reg.logger().info('Loading folders...');
            yield FoldersScreenUtils.refreshFolders();
            const tags = yield Tag.allWithNotes();
            dispatch({
                type: 'TAG_UPDATE_ALL',
                items: tags,
            });
            const masterKeys = yield MasterKey.all();
            dispatch({
                type: 'MASTERKEY_UPDATE_ALL',
                items: masterKeys,
            });
            const folderId = Setting_1.default.value('activeFolderId');
            let folder = yield Folder.load(folderId);
            if (!folder)
                folder = yield Folder.defaultFolder();
            dispatch({
                type: 'FOLDER_SET_COLLAPSED_ALL',
                ids: Setting_1.default.value('collapsedFolderIds'),
            });
            if (!folder) {
                dispatch(DEFAULT_ROUTE);
            }
            else {
                dispatch({
                    type: 'NAV_GO',
                    routeName: 'Notes',
                    folderId: folder.id,
                });
            }
            setUpQuickActions_1.default(dispatch, folderId);
        }
        catch (error) {
            alert(`Initialization error: ${error.message}`);
            reg.logger().error('Initialization error:', error);
        }
        reg.setupRecurrentSync();
        PoorManIntervals_1.default.setTimeout(() => {
            AlarmService_1.default.garbageCollect();
        }, 1000 * 60 * 60);
        ResourceService.runInBackground();
        ResourceFetcher.instance().setFileApi(() => { return reg.syncTarget().fileApi(); });
        ResourceFetcher.instance().setLogger(reg.logger());
        ResourceFetcher.instance().dispatch = dispatch;
        ResourceFetcher.instance().on('downloadComplete', resourceFetcher_downloadComplete);
        ResourceFetcher.instance().start();
        SearchEngine.instance().setDb(reg.db());
        SearchEngine.instance().setLogger(reg.logger());
        SearchEngine.instance().scheduleSyncTables();
        yield MigrationService.instance().run();
        // When the app starts we want the full sync to
        // start almost immediately to get the latest data.
        reg.scheduleSync(1000).then(() => {
            // Wait for the first sync before updating the notifications, since synchronisation
            // might change the notifications.
            AlarmService_1.default.updateAllNotifications();
            DecryptionWorker.instance().scheduleStart();
        });
        yield WelcomeUtils.install(dispatch);
        // Collect revisions more frequently on mobile because it doesn't auto-save
        // and it cannot collect anything when the app is not active.
        RevisionService.instance().runInBackground(1000 * 30);
        const pluginRunner = new PluginRunner_1.default();
        PluginService_1.default.instance().setLogger(reg.logger());
        PluginService_1.default.instance().initialize({
            joplin: {
                workspace: {},
            },
        }, pluginRunner, store);
        try {
            if (yield shim_1.default.fsDriver().exists(Setting_1.default.value('pluginDir')))
                yield PluginService_1.default.instance().loadAndRunPlugins(Setting_1.default.value('pluginDir'));
        }
        catch (error) {
            this.logger().error(`There was an error loading plugins from ${Setting_1.default.value('pluginDir')}:`, error);
        }
        try {
            if (Setting_1.default.value('plugins.devPluginPaths')) {
                const paths = Setting_1.default.value('plugins.devPluginPaths').split(',').map((p) => p.trim());
                yield PluginService_1.default.instance().loadAndRunPlugins(paths);
            }
            // Also load dev plugins that have passed via command line arguments
            if (Setting_1.default.value('startupDevPlugins')) {
                yield PluginService_1.default.instance().loadAndRunPlugins(Setting_1.default.value('startupDevPlugins'));
            }
        }
        catch (error) {
            this.logger().error(`There was an error loading plugins from ${Setting_1.default.value('plugins.devPluginPaths')}:`, error);
        }
        // const pluginString = `
        // 	/* joplin-manifest:
        // 	{
        // 		"manifest_version": 1,
        // 		"name": "JS Bundle test",
        // 		"description": "JS Bundle Test plugin",
        // 		"version": "1.0.0",
        // 		"author": "Laurent Cozic",
        // 		"homepage_url": "https://joplinapp.org"
        // 	}
        // 	*/
        // 	joplin.plugins.register({
        // 		onStart: async function() {
        // 			const folder = await joplin.data.post(['folders'], null, { title: "my plugin folder" });
        // 			await joplin.data.post(['notes'], null, { parent_id: folder.id, title: "testing plugin!" });
        // 		},
        // 	});
        // `;
        // await shim.fsDriver().writeFile(Setting.value('pluginDir') + '/simple.js', pluginString, 'utf8');
        // console.info(await shim.fsDriver().readFile(Setting.value('pluginDir') + '/simple.js', 'utf8'));
        reg.logger().info('Application initialized');
    });
}
class AppComponent extends React.Component {
    constructor() {
        super();
        this.state = {
            sideMenuContentOpacity: new Animated.Value(0),
        };
        this.lastSyncStarted_ = reducer_1.defaultState.syncStarted;
        this.backButtonHandler_ = () => {
            return this.backButtonHandler();
        };
        this.onAppStateChange_ = () => {
            PoorManIntervals_1.default.update();
        };
    }
    // 2020-10-08: It seems the initialisation code is quite fragile in general and should be kept simple.
    // For example, adding a loading screen as was done in this commit: https://github.com/laurent22/joplin/commit/569355a3182bc12e50a54249882e3d68a72c2b28.
    // had for effect that sharing with the app would create multiple instances of the app, thus breaking
    // database access and so on. It's unclear why it happens and how to fix it but reverting that commit
    // fixed the issue for now.
    //
    // Changing app launch mode doesn't help.
    //
    // It's possible that it's a bug in React Native, or perhaps the framework expects that the whole app can be
    // mounted/unmounted or multiple ones can be running at the same time, but the app was not designed in this
    // way.
    //
    // More reports and info about the multiple instance bug:
    //
    // https://github.com/laurent22/joplin/issues/3800
    // https://github.com/laurent22/joplin/issues/3804
    // https://github.com/laurent22/joplin/issues/3807
    // https://discourse.joplinapp.org/t/webdav-config-encryption-config-randomly-lost-on-android/11364
    // https://discourse.joplinapp.org/t/android-keeps-on-resetting-my-sync-and-theme/11443
    componentDidMount() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.props.appState == 'starting') {
                this.props.dispatch({
                    type: 'APP_STATE_SET',
                    state: 'initializing',
                });
                yield initialize(this.props.dispatch);
                this.props.dispatch({
                    type: 'APP_STATE_SET',
                    state: 'ready',
                });
            }
            BackButtonService.initialize(this.backButtonHandler_);
            AlarmService_1.default.setInAppNotificationHandler((alarmId) => __awaiter(this, void 0, void 0, function* () {
                const alarm = yield Alarm_1.default.load(alarmId);
                const notification = yield Alarm_1.default.makeNotification(alarm);
                this.dropdownAlert_.alertWithType('info', notification.title, notification.body ? notification.body : '');
            }));
            AppState.addEventListener('change', this.onAppStateChange_);
            const sharedData = yield ShareExtension_1.default.data();
            if (sharedData) {
                reg.logger().info('Received shared data');
                if (this.props.selectedFolderId) {
                    shareHandler_1.default(sharedData, this.props.selectedFolderId, this.props.dispatch);
                }
                else {
                    reg.logger.info('Cannot handle share - default folder id is not set');
                }
            }
        });
    }
    componentWillUnmount() {
        AppState.removeEventListener('change', this.onAppStateChange_);
    }
    componentDidUpdate(prevProps) {
        if (this.props.showSideMenu !== prevProps.showSideMenu) {
            Animated.timing(this.state.sideMenuContentOpacity, {
                toValue: this.props.showSideMenu ? 0.5 : 0,
                duration: 600,
            }).start();
        }
    }
    backButtonHandler() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.props.noteSelectionEnabled) {
                this.props.dispatch({ type: 'NOTE_SELECTION_END' });
                return true;
            }
            if (this.props.showSideMenu) {
                this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
                return true;
            }
            if (this.props.historyCanGoBack) {
                this.props.dispatch({ type: 'NAV_BACK' });
                return true;
            }
            BackHandler.exitApp();
            return false;
        });
    }
    UNSAFE_componentWillReceiveProps(newProps) {
        if (newProps.syncStarted != this.lastSyncStarted_) {
            if (!newProps.syncStarted)
                FoldersScreenUtils.refreshFolders();
            this.lastSyncStarted_ = newProps.syncStarted;
        }
    }
    sideMenu_change(isOpen) {
        // Make sure showSideMenu property of state is updated
        // when the menu is open/closed.
        this.props.dispatch({
            type: isOpen ? 'SIDE_MENU_OPEN' : 'SIDE_MENU_CLOSE',
        });
    }
    render() {
        if (this.props.appState != 'ready')
            return null;
        const theme = themeStyle(this.props.themeId);
        let sideMenuContent = null;
        let menuPosition = 'left';
        if (this.props.routeName === 'Note') {
            sideMenuContent = React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: theme.backgroundColor } },
                React.createElement(SideMenuContentNote, { options: this.props.noteSideMenuOptions }));
            menuPosition = 'right';
        }
        else {
            sideMenuContent = React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: theme.backgroundColor } },
                React.createElement(SideMenuContent, null));
        }
        const appNavInit = {
            Notes: { screen: NotesScreen },
            Note: { screen: Note_1.default },
            Tags: { screen: TagsScreen },
            Folder: { screen: FolderScreen },
            OneDriveLogin: { screen: OneDriveLoginScreen },
            DropboxLogin: { screen: DropboxLoginScreen },
            EncryptionConfig: { screen: EncryptionConfigScreen },
            UpgradeSyncTarget: { screen: UpgradeSyncTargetScreen_1.default },
            Log: { screen: LogScreen },
            Status: { screen: StatusScreen },
            Search: { screen: SearchScreen },
            Config: { screen: ConfigScreen },
        };
        const statusBarStyle = theme.appearance === 'light' ? 'dark-content' : 'light-content';
        return (React.createElement(View, { style: { flex: 1, backgroundColor: theme.backgroundColor } },
            React.createElement(SideMenu, { menu: sideMenuContent, edgeHitWidth: 5, menuPosition: menuPosition, onChange: (isOpen) => this.sideMenu_change(isOpen), onSliding: (percent) => {
                    this.props.dispatch({
                        type: 'SIDE_MENU_OPEN_PERCENT',
                        value: percent,
                    });
                } },
                React.createElement(StatusBar, { barStyle: statusBarStyle }),
                React.createElement(MenuContext, { style: { flex: 1, backgroundColor: theme.backgroundColor } },
                    React.createElement(SafeAreaView, { style: { flex: 1 } },
                        React.createElement(View, { style: { flex: 1, backgroundColor: theme.backgroundColor } },
                            React.createElement(AppNav, { screens: appNavInit })),
                        React.createElement(DropdownAlert, { ref: (ref) => this.dropdownAlert_ = ref, tapToCloseEnabled: true }),
                        React.createElement(Animated.View, { pointerEvents: 'none', style: { position: 'absolute', backgroundColor: 'black', opacity: this.state.sideMenuContentOpacity, width: '100%', height: '120%' } }))))));
    }
}
const mapStateToProps = (state) => {
    return {
        historyCanGoBack: state.historyCanGoBack,
        showSideMenu: state.showSideMenu,
        syncStarted: state.syncStarted,
        appState: state.appState,
        noteSelectionEnabled: state.noteSelectionEnabled,
        selectedFolderId: state.selectedFolderId,
        routeName: state.route.routeName,
        themeId: state.settings.theme,
        noteSideMenuOptions: state.noteSideMenuOptions,
    };
};
const App = connect(mapStateToProps)(AppComponent);
class Root extends React.Component {
    render() {
        return (React.createElement(Provider, { store: store },
            React.createElement(App, null)));
    }
}
exports.default = Root;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm9vdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJvb3QudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsMkRBQW9EO0FBQ3BELDZEQUFzRDtBQUN0RCx5Q0FBMkQ7QUFDM0QsNERBQXFEO0FBQ3JELGdGQUFxRTtBQUNyRSw0Q0FBcUM7QUFDckMsdUNBQWdEO0FBQ2hELDBEQUFtRDtBQUNuRCxzREFBcUQ7QUFDckQsNEZBQXFGO0FBQ3JGLGdEQUF5QztBQUN6QywyREFBb0Q7QUFDcEQsdURBQWdEO0FBQ2hELG1EQUE0QztBQUM1QyxtQ0FBNEI7QUFDNUIscUdBQTZGO0FBQzdGLG1DQUE0QjtBQUM1QixzRUFBK0Q7QUFDL0Qsa0VBQTJEO0FBRTNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzlHLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQzVELE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3JELE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxHQUFHLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3JFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3pELE1BQU0sRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFELE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7QUFDckYsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FB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