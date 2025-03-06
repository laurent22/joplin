const React = require('react');
import shim from '@joplin/lib/shim';
shim.setReact(React);

import setupQuickActions from './setupQuickActions';
import PluginAssetsLoader from './PluginAssetsLoader';
import AlarmService from '@joplin/lib/services/AlarmService';
import Alarm from '@joplin/lib/models/Alarm';
import time from '@joplin/lib/time';
import Logger, { TargetType } from '@joplin/utils/Logger';
import BaseModel from '@joplin/lib/BaseModel';
import BaseService from '@joplin/lib/services/BaseService';
import ResourceService from '@joplin/lib/services/ResourceService';
import KvStore from '@joplin/lib/services/KvStore';
import NoteScreen from './components/screens/Note/Note';
import UpgradeSyncTargetScreen from './components/screens/UpgradeSyncTargetScreen';
import Setting, { AppType, Env } from '@joplin/lib/models/Setting';
import PoorManIntervals from '@joplin/lib/PoorManIntervals';
import reducer, { NotesParent, parseNotesParent, serializeNotesParent } from '@joplin/lib/reducer';
import ShareExtension from './utils/ShareExtension';
import handleShared from './utils/shareHandler';
import uuid from '@joplin/lib/uuid';
import { loadKeychainServiceAndSettings } from '@joplin/lib/services/SettingUtils';
import { _, setLocale } from '@joplin/lib/locale';
import SyncTargetJoplinServer from '@joplin/lib/SyncTargetJoplinServer';
import SyncTargetJoplinCloud from '@joplin/lib/SyncTargetJoplinCloud';
import SyncTargetOneDrive from '@joplin/lib/SyncTargetOneDrive';
import initProfile from '@joplin/lib/services/profileConfig/initProfile';
const VersionInfo = require('react-native-version-info').default;
import { Keyboard, BackHandler, Animated, StatusBar, Platform, Dimensions } from 'react-native';
import { AppState as RNAppState, EmitterSubscription, View, Text, Linking, NativeEventSubscription, Appearance, ActivityIndicator } from 'react-native';
import getResponsiveValue from './components/getResponsiveValue';
import NetInfo from '@react-native-community/netinfo';
const DropdownAlert = require('react-native-dropdownalert').default;
const AlarmServiceDriver = require('./services/AlarmServiceDriver').default;
const SafeAreaView = require('./components/SafeAreaView');
const { connect, Provider } = require('react-redux');
import fastDeepEqual = require('fast-deep-equal');
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import BackButtonService from './services/BackButtonService';
import NavService from '@joplin/lib/services/NavService';
import { createStore, applyMiddleware, Dispatch } from 'redux';
import reduxSharedMiddleware from '@joplin/lib/components/shared/reduxSharedMiddleware';
import shimInit from './utils/shim-init-react';
const { AppNav } = require('./components/app-nav.js');
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import BaseSyncTarget from '@joplin/lib/BaseSyncTarget';
import Resource from '@joplin/lib/models/Resource';
import Tag from '@joplin/lib/models/Tag';
import NoteTag from '@joplin/lib/models/NoteTag';
import BaseItem from '@joplin/lib/models/BaseItem';
import MasterKey from '@joplin/lib/models/MasterKey';
import Revision from '@joplin/lib/models/Revision';
import RevisionService from '@joplin/lib/services/RevisionService';
import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import Database from '@joplin/lib/database';
import NotesScreen from './components/screens/Notes';
import TagsScreen from './components/screens/tags';
import ConfigScreen from './components/screens/ConfigScreen/ConfigScreen';
const { FolderScreen } = require('./components/screens/folder.js');
import LogScreen from './components/screens/LogScreen';
import StatusScreen from './components/screens/status';
import SearchScreen from './components/screens/SearchScreen';
const { OneDriveLoginScreen } = require('./components/screens/onedrive-login.js');
import EncryptionConfigScreen from './components/screens/encryption-config';
import DropboxLoginScreen from './components/screens/dropbox-login.js';
import { MenuProvider } from 'react-native-popup-menu';
import SideMenu, { SideMenuPosition } from './components/SideMenu';
import SideMenuContent from './components/side-menu-content';
import SideMenuContentNote from './components/SideMenuContentNote';
import { reg } from '@joplin/lib/registry';
const { defaultState } = require('@joplin/lib/reducer');
import FileApiDriverLocal from '@joplin/lib/file-api-driver-local';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import WelcomeUtils from '@joplin/lib/WelcomeUtils';
import { themeStyle } from './components/global-style';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import SyncTargetFilesystem from '@joplin/lib/SyncTargetFilesystem';
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('@joplin/lib/SyncTargetWebDAV.js');
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3.js');
import BiometricPopup from './components/biometrics/BiometricPopup';
import initLib from '@joplin/lib/initLib';
import { isCallbackUrl, parseCallbackUrl, CallbackUrlCommand } from '@joplin/lib/callbackUrlUtils';
import JoplinCloudLoginScreen from './components/screens/JoplinCloudLoginScreen';

import SyncTargetNone from '@joplin/lib/SyncTargetNone';



SyncTargetRegistry.addClass(SyncTargetNone);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetJoplinServer);
SyncTargetRegistry.addClass(SyncTargetJoplinCloud);

import FsDriverRN from './utils/fs-driver/fs-driver-rn';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import MigrationService from '@joplin/lib/services/MigrationService';
import { clearSharedFilesCache } from './utils/ShareUtils';
import setIgnoreTlsErrors from './utils/TlsUtils';
import ShareService from '@joplin/lib/services/share/ShareService';
import setupNotifications from './utils/setupNotifications';
import { loadMasterKeysFromSettings, migrateMasterPassword } from '@joplin/lib/services/e2ee/utils';
import { setRSA } from '@joplin/lib/services/e2ee/ppk';
import RSA from './services/e2ee/RSA.react-native';
import { runIntegrationTests as runRsaIntegrationTests } from '@joplin/lib/services/e2ee/ppkTestUtils';
import { runIntegrationTests as runCryptoIntegrationTests } from '@joplin/lib/services/e2ee/cryptoTestUtils';
import { Theme, ThemeAppearance } from '@joplin/lib/themes/type';
import ProfileSwitcher from './components/ProfileSwitcher/ProfileSwitcher';
import ProfileEditor from './components/ProfileSwitcher/ProfileEditor';
import sensorInfo, { SensorInfo } from './components/biometrics/sensorInfo';
import { getCurrentProfile } from '@joplin/lib/services/profileConfig';
import { getDatabaseName, getPluginDataDir, getProfilesRootDir, getResourceDir, setDispatch } from './services/profiles';
import userFetcher, { initializeUserFetcher } from '@joplin/lib/utils/userFetcher';
import { ReactNode } from 'react';
import { parseShareCache } from '@joplin/lib/services/share/reducer';
import autodetectTheme, { onSystemColorSchemeChange } from './utils/autodetectTheme';
import runOnDeviceFsDriverTests from './utils/fs-driver/runOnDeviceTests';
import PluginRunnerWebView from './components/plugins/PluginRunnerWebView';
import { refreshFolders, scheduleRefreshFolders } from '@joplin/lib/folders-screen-utils';
import KeymapService from '@joplin/lib/services/KeymapService';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import initializeCommandService from './utils/initializeCommandService';
import PlatformImplementation from './services/plugins/PlatformImplementation';
import ShareManager from './components/screens/ShareManager';
import appDefaultState, { DEFAULT_ROUTE } from './utils/appDefaultState';
import { setDateFormat, setTimeFormat, setTimeLocale } from '@joplin/utils/time';
import DatabaseDriverReactNative from './utils/database-driver-react-native';
import DialogManager from './components/DialogManager';
import lockToSingleInstance from './utils/lockToSingleInstance';
import { AppState } from './utils/types';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import PluginNotification from './components/plugins/PluginNotification';

const logger = Logger.create('root');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let storeDispatch: any = function(_action: any) {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const logReducerAction = function(action: any) {
	if (['SIDE_MENU_OPEN_PERCENT', 'SYNC_REPORT_UPDATE'].indexOf(action.type) >= 0) return;

	const msg = [action.type];
	if (action.routeName) msg.push(action.routeName);

	// reg.logger().debug('Reducer action', msg.join(', '));
};

const biometricsEnabled = (sensorInfo: SensorInfo): boolean => {
	return !!sensorInfo && sensorInfo.enabled;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const generalMiddleware = (store: any) => (next: any) => async (action: any) => {
	logReducerAction(action);
	PoorManIntervals.update(); // This function needs to be called regularly so put it here

	const result = next(action);
	const newState: AppState = store.getState();
	let doRefreshFolders = false;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	await reduxSharedMiddleware(store, next, action, storeDispatch as any);

	if (action.type === 'NAV_GO') Keyboard.dismiss();

	if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
		if (!await reg.syncTarget().syncStarted()) void reg.scheduleSync(1000, { syncSteps: ['update_remote', 'delete_remote'] }, true);
		SearchEngine.instance().scheduleSyncTables();
	}

	if (['FOLDER_UPDATE_ONE'].indexOf(action.type) >= 0) {
		doRefreshFolders = true;
	}

	if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
		await AlarmService.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
	}

	if (action.type === 'NOTE_DELETE' && newState.route?.routeName === 'Note' && newState.route.noteId === action.id) {
		const parentItem = action.originalItem?.parent_id ? await Folder.load(action.originalItem?.parent_id) : null;
		const parentId = getDisplayParentId(action.originalItem, parentItem);
		await NavService.go('Notes', { folderId: parentId });
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'sync.interval' || action.type === 'SETTING_UPDATE_ALL') {
		reg.setupRecurrentSync();
	}

	if ((action.type === 'SETTING_UPDATE_ONE' && (action.key === 'dateFormat' || action.key === 'timeFormat')) || (action.type === 'SETTING_UPDATE_ALL')) {
		time.setDateFormat(Setting.value('dateFormat'));
		time.setTimeFormat(Setting.value('timeFormat'));
		setDateFormat(Setting.value('dateFormat'));
		setTimeFormat(Setting.value('timeFormat'));
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'locale' || action.type === 'SETTING_UPDATE_ALL') {
		setLocale(Setting.value('locale'));
		setTimeLocale(Setting.value('locale'));
	}

	// Like the desktop and CLI apps, we run this whenever the sync target properties change.
	// Previously, this only ran when encryption was enabled/disabled. However, after fetching
	// a new key, this needs to run and so we run it when the sync target info changes.
	if (
		(action.type === 'SETTING_UPDATE_ONE' && (action.key === 'syncInfoCache' || action.key.startsWith('encryption.')))
		|| action.type === 'SETTING_UPDATE_ALL'
	) {
		await loadMasterKeysFromSettings(EncryptionService.instance());
		void DecryptionWorker.instance().scheduleStart();
		const loadedMasterKeyIds = EncryptionService.instance().loadedMasterKeyIds();

		storeDispatch({
			type: 'MASTERKEY_REMOVE_NOT_LOADED',
			ids: loadedMasterKeyIds,
		});

		// Schedule a sync operation so that items that need to be encrypted
		// are sent to sync target.
		void reg.scheduleSync(null, null, true);
	}

	if (
		action.type === 'AUTODETECT_THEME'
		|| action.type === 'SETTING_UPDATE_ALL'
		|| (action.type === 'SETTING_UPDATE_ONE' && ['themeAutoDetect', 'preferredLightTheme', 'preferredDarkTheme'].includes(action.key))
	) {
		autodetectTheme();
	}

	if (action.type === 'NAV_GO' && action.routeName === 'Notes') {
		if ('selectedFolderId' in newState) {
			Setting.setValue('activeFolderId', newState.selectedFolderId);
		}

		const notesParent: NotesParent = {
			type: action.smartFilterId ? 'SmartFilter' : 'Folder',
			selectedItemId: action.smartFilterId ? action.smartFilterId : newState.selectedFolderId,
		};
		Setting.setValue('notesParent', serializeNotesParent(notesParent));
	}

	if (action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
		void DecryptionWorker.instance().scheduleStart();
	}

	if (action.type === 'SYNC_CREATED_OR_UPDATED_RESOURCE') {
		void ResourceFetcher.instance().autoAddResources();
	}

	if (doRefreshFolders) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		await scheduleRefreshFolders((action: any) => storeDispatch(action), newState.selectedFolderId);
	}

	return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const navHistory: any[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function historyCanGoBackTo(route: any) {
	if (route.routeName === 'Folder') return false;

	// There's no point going back to these screens in general and, at least in OneDrive case,
	// it can be buggy to do so, due to incorrectly relying on global state (reg.syncTarget...)
	if (route.routeName === 'OneDriveLogin') return false;
	if (route.routeName === 'DropboxLogin') return false;

	return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const appReducer = (state = appDefaultState, action: any) => {
	let newState = state;
	let historyGoingBack = false;

	try {
		switch (action.type) {

		case 'NAV_BACK':
		case 'NAV_GO':

			if (action.type === 'NAV_BACK') {
				if (!navHistory.length) break;

				const newAction = navHistory.pop();
				action = newAction ? newAction : navHistory.pop();

				historyGoingBack = true;
			}

			{
				const currentRoute = state.route;

				if (!historyGoingBack && historyCanGoBackTo(currentRoute)) {
					const previousRoute = navHistory.length && navHistory[navHistory.length - 1];
					const isDifferentRoute = !previousRoute || !fastDeepEqual(navHistory[navHistory.length - 1], currentRoute);

					// Avoid multiple consecutive duplicate screens in the navigation history -- these can make
					// pressing "back" seem to have no effect.
					if (isDifferentRoute) {
						navHistory.push(currentRoute);
					}
				}

				if (action.clearHistory) {
					navHistory.splice(0, navHistory.length);
				}

				newState = { ...state };

				newState.selectedNoteHash = '';

				if (action.routeName === 'Search') {
					newState.notesParentType = 'Search';
				}

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
					newState.smartFilterId = action.smartFilterId;
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
				} else {
					newState.sharedData = null;
				}

				newState.route = action;
				newState.historyCanGoBack = !!navHistory.length;

				logger.debug('Navigated to route:', newState.route?.routeName, 'with notesParentType:', newState.notesParentType);
			}
			break;

		case 'SIDE_MENU_TOGGLE':

			newState = { ...state };
			newState.showSideMenu = !newState.showSideMenu;
			break;

		case 'SIDE_MENU_OPEN':

			newState = { ...state };
			newState.showSideMenu = true;
			break;

		case 'SIDE_MENU_CLOSE':

			newState = { ...state };
			newState.showSideMenu = false;
			break;

		case 'SET_PLUGIN_PANELS_DIALOG_VISIBLE':
			newState = { ...state };
			newState.showPanelsDialog = action.visible;
			break;

		case 'NOTE_SELECTION_TOGGLE':

			{
				newState = { ...state };

				const noteId = action.id;
				const newSelectedNoteIds = state.selectedNoteIds.slice();
				const existingIndex = state.selectedNoteIds.indexOf(noteId);

				if (existingIndex >= 0) {
					newSelectedNoteIds.splice(existingIndex, 1);
				} else {
					newSelectedNoteIds.push(noteId);
				}

				newState.selectedNoteIds = newSelectedNoteIds;
				newState.noteSelectionEnabled = !!newSelectedNoteIds.length;
			}
			break;

		case 'NOTE_SELECTION_START':

			if (!state.noteSelectionEnabled) {
				newState = { ...state };
				newState.noteSelectionEnabled = true;
				newState.selectedNoteIds = [action.id];
			}
			break;

		case 'NOTE_SELECTION_END':

			newState = { ...state };
			newState.noteSelectionEnabled = false;
			newState.selectedNoteIds = [];
			break;

		case 'NOTE_SIDE_MENU_OPTIONS_SET':

			newState = { ...state };
			newState.noteSideMenuOptions = action.options;
			break;

		case 'SET_SIDE_MENU_TOUCH_GESTURES_DISABLED':
			newState = { ...state };
			newState.disableSideMenuGestures = action.disableSideMenuGestures;
			break;

		case 'MOBILE_DATA_WARNING_UPDATE':

			newState = { ...state };
			newState.isOnMobileData = action.isOnMobileData;
			break;

		case 'KEYBOARD_VISIBLE_CHANGE':
			newState = { ...state, keyboardVisible: action.visible };
			break;
		}
	} catch (error) {
		error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	return reducer(newState, action);
};

const store = createStore(appReducer, applyMiddleware(generalMiddleware));
storeDispatch = store.dispatch;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function resourceFetcher_downloadComplete(event: any) {
	if (event.encrypted) {
		void DecryptionWorker.instance().scheduleStart();
	}
}

function decryptionWorker_resourceMetadataButNotBlobDecrypted() {
	ResourceFetcher.instance().scheduleAutoAddResources();
}

const initializeTempDir = async () => {
	const tempDir = `${getProfilesRootDir()}/tmp`;

	// Re-create the temporary directory.
	try {
		await shim.fsDriver().remove(tempDir);
	} catch (_error) {
		// The logger may not exist yet. Do nothing.
	}

	await shim.fsDriver().mkdir(tempDir);
	return tempDir;
};

const getInitialActiveFolder = async () => {
	let folderId = Setting.value('activeFolderId');

	// In some cases (e.g. new profile/install), activeFolderId hasn't been set yet.
	// Because activeFolderId is used to determine the parent for new notes, initialize
	// it here:
	if (!folderId) {
		folderId = (await Folder.defaultFolder())?.id;
		if (folderId) {
			Setting.setValue('activeFolderId', folderId);
		}
	}
	return await Folder.load(folderId);
};

const singleInstanceLock = lockToSingleInstance();

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
async function initialize(dispatch: Dispatch) {
	shimInit();

	setDispatch(dispatch);
	const { profileConfig, isSubProfile } = await initProfile(getProfilesRootDir());
	const currentProfile = getCurrentProfile(profileConfig);

	dispatch({
		type: 'PROFILE_CONFIG_SET',
		value: profileConfig,
	});

	Setting.setConstant('env', __DEV__ ? Env.Dev : Env.Prod);
	Setting.setConstant('appId', 'net.cozic.joplin-mobile');
	Setting.setConstant('appType', AppType.Mobile);
	Setting.setConstant('tempDir', await initializeTempDir());
	Setting.setConstant('cacheDir', `${getProfilesRootDir()}/cache`);
	const resourceDir = getResourceDir(currentProfile, isSubProfile);
	Setting.setConstant('resourceDir', resourceDir);
	Setting.setConstant('pluginDir', `${getProfilesRootDir()}/plugins`);
	Setting.setConstant('pluginDataDir', getPluginDataDir(currentProfile, isSubProfile));

	await shim.fsDriver().mkdir(resourceDir);

	// Do as much setup as possible before checking the lock -- the lock intentionally waits for
	// messages from other clients for several hundred ms.
	await singleInstanceLock;

	const logDatabase = new Database(new DatabaseDriverReactNative());
	await logDatabase.open({ name: 'log.sqlite' });
	await logDatabase.exec(Logger.databaseCreateTableSql());

	const mainLogger = new Logger();
	mainLogger.addTarget(TargetType.Database, { database: logDatabase, source: 'm' });
	mainLogger.setLevel(Logger.LEVEL_INFO);

	if (Setting.value('env') === 'dev') {
		mainLogger.addTarget(TargetType.Console);
		mainLogger.setLevel(Logger.LEVEL_DEBUG);
	}

	Logger.initializeGlobalLogger(mainLogger);
	initLib(mainLogger);

	reg.setLogger(mainLogger);
	reg.setShowErrorMessageBoxHandler((message: string) => { alert(message); });
	reg.setDispatch(dispatch);

	BaseService.logger_ = mainLogger;
	// require('@joplin/lib/ntpDate').setLogger(reg.logger());

	reg.logger().info('====================================');
	reg.logger().info(`Starting application ${Setting.value('appId')} v${VersionInfo.appVersion} (${Setting.value('env')})`);

	const dbLogger = new Logger();
	dbLogger.addTarget(TargetType.Database, { database: logDatabase, source: 'm' });
	if (Setting.value('env') === 'dev') {
		dbLogger.addTarget(TargetType.Console);
		dbLogger.setLevel(Logger.LEVEL_INFO); // Set to LEVEL_DEBUG for full SQL queries
	} else {
		dbLogger.setLevel(Logger.LEVEL_INFO);
	}

	const db = new JoplinDatabase(new DatabaseDriverReactNative());
	db.setLogger(dbLogger);
	reg.setDb(db);

	// reg.dispatch = dispatch;
	BaseModel.dispatch = dispatch;
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

	AlarmService.setDriver(new AlarmServiceDriver(mainLogger));
	AlarmService.setLogger(mainLogger);

	// Currently CommandService is just used for plugins.
	initializeCommandService(store);

	// KeymapService is also present for plugin compatibility
	KeymapService.instance().initialize();

	// Even if there are no plugins, we need to initialize the PluginService so that
	// plugin search can work.
	const platformImplementation = PlatformImplementation.instance();
	PluginService.instance().initialize(
		platformImplementation.versionInfo.version, platformImplementation, null, store,
	);

	setRSA(RSA);

	try {
		if (Setting.value('env') === 'prod') {
			await db.open({ name: getDatabaseName(currentProfile, isSubProfile) });
		} else {
			await db.open({ name: getDatabaseName(currentProfile, isSubProfile, '-20240127-1') });

			// await db.clearForTesting();
		}

		reg.logger().info('Database is ready.');
		reg.logger().info('Loading settings...');

		await loadKeychainServiceAndSettings([]);
		await migrateMasterPassword();

		if (!Setting.value('clientId')) Setting.setValue('clientId', uuid.create());
		reg.logger().info(`Client ID: ${Setting.value('clientId')}`);

		BaseItem.syncShareCache = parseShareCache(Setting.value('sync.shareCache'));

		if (Setting.value('firstStart')) {
			const detectedLocale = shim.detectAndSetLocale(Setting);
			reg.logger().info(`First start: detected locale as ${detectedLocale}`);

			if (shim.mobilePlatform() === 'web') {
				// Web browsers generally have more limited storage than desktop and mobile apps:
				Setting.setValue('sync.resourceDownloadMode', 'auto');
				// For now, geolocation is disabled by default on web until the web permissions workflow
				// is improved. At present, trackLocation=true causes the "allow location access" prompt
				// to appear without a clear indicator for why Joplin wants this information.
				Setting.setValue('trackLocation', false);
				logger.info('First start on web: Set resource download mode to auto and disabled location tracking.');
			}

			Setting.skipDefaultMigrations();
			Setting.setValue('firstStart', false);
		} else {
			Setting.applyDefaultMigrations();
		}

		if (Setting.value('env') === Env.Dev) {
			// Setting.setValue('sync.10.path', 'https://api.joplincloud.com');
			// Setting.setValue('sync.10.userContentPath', 'https://joplinusercontent.com');
			Setting.setValue('sync.10.path', 'http://api.joplincloud.local:22300');
			Setting.setValue('sync.10.userContentPath', 'http://joplinusercontent.local:22300');
			Setting.setValue('sync.10.website', 'http://joplincloud.local:22300');

			// Setting.setValue('sync.target', 10);
			// Setting.setValue('sync.10.username', 'user1@example.com');
			// Setting.setValue('sync.10.password', '111111');
		}

		if (Setting.value('db.ftsEnabled') === -1) {
			const ftsEnabled = await db.ftsEnabled();
			Setting.setValue('db.ftsEnabled', ftsEnabled ? 1 : 0);
			reg.logger().info('db.ftsEnabled = ', Setting.value('db.ftsEnabled'));
		}

		if (Setting.value('env') === 'dev') {
			Setting.setValue('welcome.enabled', false);
		}

		await PluginAssetsLoader.instance().importAssets();

		// eslint-disable-next-line require-atomic-updates
		BaseItem.revisionService_ = RevisionService.instance();

		// Note: for now we hard-code the folder sort order as we need to
		// create a UI to allow customisation (started in branch mobile_add_sidebar_buttons)
		Setting.setValue('folders.sortOrder.field', 'title');
		Setting.setValue('folders.sortOrder.reverse', false);

		reg.logger().info(`Sync target: ${Setting.value('sync.target')}`);

		setLocale(Setting.value('locale'));

		if (Platform.OS === 'android') {
			const ignoreTlsErrors = Setting.value('net.ignoreTlsErrors');
			if (ignoreTlsErrors) {
				await setIgnoreTlsErrors(ignoreTlsErrors);
			}
		}

		// ----------------------------------------------------------------
		// E2EE SETUP
		// ----------------------------------------------------------------

		EncryptionService.fsDriver_ = fsDriver;
		// eslint-disable-next-line require-atomic-updates
		BaseItem.encryptionService_ = EncryptionService.instance();
		BaseItem.shareService_ = ShareService.instance();
		Resource.shareService_ = ShareService.instance();
		DecryptionWorker.instance().dispatch = dispatch;
		DecryptionWorker.instance().setLogger(mainLogger);
		DecryptionWorker.instance().setKvStore(KvStore.instance());
		DecryptionWorker.instance().setEncryptionService(EncryptionService.instance());
		await loadMasterKeysFromSettings(EncryptionService.instance());
		DecryptionWorker.instance().on('resourceMetadataButNotBlobDecrypted', decryptionWorker_resourceMetadataButNotBlobDecrypted);

		// ----------------------------------------------------------------
		// / E2EE SETUP
		// ----------------------------------------------------------------

		await ShareService.instance().initialize(store, EncryptionService.instance());

		reg.logger().info('Loading folders...');

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		await refreshFolders((action: any) => dispatch(action), '');

		const tags = await Tag.allWithNotes();

		dispatch({
			type: 'TAG_UPDATE_ALL',
			items: tags,
		});

		// const masterKeys = await MasterKey.all();

		// dispatch({
		// 	type: 'MASTERKEY_UPDATE_ALL',
		// 	items: masterKeys,
		// });

		const folder = await getInitialActiveFolder();

		dispatch({
			type: 'FOLDER_SET_COLLAPSED_ALL',
			ids: Setting.value('collapsedFolderIds'),
		});

		const notesParent = parseNotesParent(Setting.value('notesParent'), Setting.value('activeFolderId'));

		if (notesParent && notesParent.type === 'SmartFilter') {
			dispatch(DEFAULT_ROUTE);
		} else if (!folder) {
			dispatch(DEFAULT_ROUTE);
		} else {
			dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: folder.id,
			});
		}

		await clearSharedFilesCache();
	} catch (error) {
		alert(`Initialization error: ${error.message}`);
		reg.logger().error('Initialization error:', error);
	}

	reg.setupRecurrentSync();

	initializeUserFetcher();
	PoorManIntervals.setInterval(() => { void userFetcher(); }, 1000 * 60 * 60);

	PoorManIntervals.setTimeout(() => {
		void AlarmService.garbageCollect();
	}, 1000 * 60 * 60);

	ResourceService.runInBackground();

	ResourceFetcher.instance().setFileApi(() => { return reg.syncTarget().fileApi(); });
	ResourceFetcher.instance().setLogger(reg.logger());
	ResourceFetcher.instance().dispatch = dispatch;
	ResourceFetcher.instance().on('downloadComplete', resourceFetcher_downloadComplete);
	void ResourceFetcher.instance().start();

	SearchEngine.instance().setDb(reg.db());
	SearchEngine.instance().setLogger(reg.logger());
	SearchEngine.instance().scheduleSyncTables();

	await MigrationService.instance().run();

	// When the app starts we want the full sync to
	// start almost immediately to get the latest data.
	// doWifiConnectionCheck set to true so initial sync
	// doesn't happen on mobile data
	// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
	void reg.scheduleSync(100, null, true).then(() => {
		// Wait for the first sync before updating the notifications, since synchronisation
		// might change the notifications.
		void AlarmService.updateAllNotifications();

		void DecryptionWorker.instance().scheduleStart();
	});

	await WelcomeUtils.install(Setting.value('locale'), dispatch);

	// Collect revisions more frequently on mobile because it doesn't auto-save
	// and it cannot collect anything when the app is not active.
	RevisionService.instance().runInBackground(1000 * 30);

	// ----------------------------------------------------------------------------
	// Plugin service setup
	// ----------------------------------------------------------------------------

	// On startup, we can clear plugin update state -- plugins that were updated when the
	// user last ran the app have been updated and will be reloaded.
	const pluginService = PluginService.instance();
	const pluginSettings = pluginService.unserializePluginSettings(Setting.value('plugins.states'));

	const updatedSettings = pluginService.clearUpdateState(pluginSettings);
	Setting.setValue('plugins.states', updatedSettings);

	// ----------------------------------------------------------------------------
	// Keep this below to test react-native-rsa-native
	// ----------------------------------------------------------------------------

	// const testData = await createTestData();
	// await checkTestData(testData);

	// const testData = {
	// 	"publicKey": "-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAoMx9NBioka8DUjO3bKrWMn8uJ23LH1xySogQFR6yh6qbl6i5LKTw\nPgqvv55FUuQtYTMtUTVLggYQhdCBvwbBrD1OqO4xU6Ew7x5/TQKPV3MSgYaps3FF\nOdipC4FyA00jBe6Z1CIpL+ZaSnvjDbMUf5lW8bmfRuXfdBGAcdSBjqm9ttajOws+\n7BBSQ9nI5dnBnWRIVEUb7e9bulgANzM1LMUOE+gaef7T3uKzc+Cx3BhHgw1JdFbL\nZAndYtP52KI5N3oiFM4II26DxmDrO1tQokNM88l5xT0BXPhYiEl1CeBpo5VHZBY2\nRHr4MM/OyAXSUdulsDzbntpE+Y85zv7gpQIDAQAB\n-----END RSA PUBLIC KEY-----",
	// 	"privateKey": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAoMx9NBioka8DUjO3bKrWMn8uJ23LH1xySogQFR6yh6qbl6i5\nLKTwPgqvv55FUuQtYTMtUTVLggYQhdCBvwbBrD1OqO4xU6Ew7x5/TQKPV3MSgYap\ns3FFOdipC4FyA00jBe6Z1CIpL+ZaSnvjDbMUf5lW8bmfRuXfdBGAcdSBjqm9ttaj\nOws+7BBSQ9nI5dnBnWRIVEUb7e9bulgANzM1LMUOE+gaef7T3uKzc+Cx3BhHgw1J\ndFbLZAndYtP52KI5N3oiFM4II26DxmDrO1tQokNM88l5xT0BXPhYiEl1CeBpo5VH\nZBY2RHr4MM/OyAXSUdulsDzbntpE+Y85zv7gpQIDAQABAoIBAEA0Zmm+ztAcyX6x\nF7RUImLXVV55AHntN9V6rrFAKJjzDl1oCUhCM4sSSUqBr7yBT31YKegbF6M7OK21\nq5jS4dIcSKQ7N4bk/dz8mGfvdby9Pc5qLqhvuex3DkiBzzxyOGHN+64wVbHCkJrd\nDLQTpUOtvoGWVHrCno6Bzn+lEnYbvdr0hqI5H4D0ubk6TYed1/4ZlJf0R/o/4jnl\nou0UG2hpJN4ur506cttkZJSTxLjzdO38JuQIAkCEglrMYVY61lBNPxC11Kr3ZN7o\ncm7gWZVyP26KoU27t/g+2FoiBGsWLqGYiuTaqT6dKZ2vHyJGjJIZZStv5ye2Ez8V\nKQwpjQECgYEA3xtwYu4n/G5UjEMumkXHNd/bDamelo1aQvvjkVvxKeASNBqV8cM0\n6Jb2FCuT9Y3mWbFTM0jpqXehpHUOCCnrPKGKnJ0ZS4/SRIrtw0iM6q17fTAqmuOt\nhX0pJ77Il8lVCtx4ItsW+LUGbm6CwotlYLVUuyluhKe0pGw2yafi2N0CgYEAuIFk\ng4p7x0i1LFAlIP0YQ07bJQ0E6FEWbCfMgrV3VjtbnT99EaqPOHhMasITCuoEFlh8\ncgyZ6oH7GEy4IRWrM+Mlm47S+NTrr6KgnTGf570ZAFuqnJac97oFB7BvlQsQot6F\n0L2JKM7dQKIMlvwA9DoXZdKX/9ykiqqIpawNxmkCgYEAuyJOwAw2ads4+3UWT7wb\nfarIF8ugA3OItAqHNFNEEvWpDx8FigVMCZMl0IFE14AwKCc+PBP6OXTolgLAxEQ0\n1WRB2V9D6kc1/Nvy1guydt0QaU7PTZ+O2hrDPF0f74Cl3jhSZBoUSIO+Yz46W2eE\nnvs5mMsFsirgr9E8myRAd9kCgYAGMCDE4KIiHugkolN8dcCYkU58QaGGgSG1YuhT\nAe8Mr1T1QynYq9W92RsHAZdN6GdWsIUL9iw7VzyqpfgO9AEX7mhWfUXKHqoA6/1j\nCEUKqqbqAikIs2x0SoLcrSgw4XwfWkM2qwSsn7N/9W9iqPUHO+OJALUkWawTEoEe\nvVSA8QKBgQCEYCPnxgeQSZkrv7x5soXzgF1YN5EZRa1mTUqPBubs564ZjIIY66mI\nCTaHl7U1cPAhx7mHkSzP/i5NjjLqPZZNOyawWDEEmOzxX69OIzKImb6mEQNyS3do\nI8jnpN5q9pw5TvuEIYSrGqQVnHeaEjSvcT48W9GuzjNVscGfw76fPg==\n-----END RSA PRIVATE KEY-----",
	// 	"plaintext": "just testing",
	// 	"ciphertext": "BfkKLdrmd2UX4sPf0bzhfqrg3rKwH5DS7dPAqdmoQuHlrvEBrYKqheekwpnWQgGggGcm/orlrsQRwlexLv7jfRbb0bMnElkySMu4w6wTxILB66RX9H3vXCz02SwHKFRcuGJxlzTPUC23ki6f/McYJ2n/2L8qYxBO8fncTKutIWV54jY19RS1wQ4IdVDBqzji8D0QsRxUhVlpRk4qxsVnyuoyg9AyDe91LOYKfRc6NdapFij996nKzjxFcKOdBqpis34fN3Cg7avcs2Dm5vi7zlRhyGqJJhORXTU3x6hVwOBkVAisgaB7xS3lHiYp6Fs5tP3hBd0kFwVVx8gALbHsgg=="
	// };
	// await checkTestData(testData);

	// await printTestData();

	// ----------------------------------------------------------------------------
	// On desktop and CLI we run various tests to check that node-rsa is working
	// as expected. On mobile however we cannot run test units directly on
	// device, and that's what would be needed to automatically verify
	// react-native-rsa-native. So instead we run the tests every time the
	// mobile app is started in dev mode. If there's any regression the below
	// call will throw an error, alerting us of the issue. Otherwise it will
	// just print some messages in the console.
	// ----------------------------------------------------------------------------
	if (Setting.value('env') === 'dev') {
		if (Platform.OS !== 'web') {
			await runRsaIntegrationTests();
		} else {
			logger.info('Skipping encryption tests -- not supported on web.');
		}
		await runCryptoIntegrationTests();
		await runOnDeviceFsDriverTests();
	}

	reg.logger().info('Application initialized');
}

class AppComponent extends React.Component {

	private urlOpenListener_: EmitterSubscription|null = null;
	private appStateChangeListener_: NativeEventSubscription|null = null;
	private themeChangeListener_: NativeEventSubscription|null = null;
	private keyboardShowListener_: EmitterSubscription|null = null;
	private keyboardHideListener_: EmitterSubscription|null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private dropdownAlert_ = (_data: any) => new Promise<any>(res => res);
	private callbackUrl: string|null = null;

	public constructor() {
		super();

		this.state = {
			sideMenuContentOpacity: new Animated.Value(0),
			sideMenuWidth: this.getSideMenuWidth(),
			sensorInfo: null,
		};

		this.lastSyncStarted_ = defaultState.syncStarted;

		this.backButtonHandler_ = () => {
			return this.backButtonHandler();
		};

		this.onAppStateChange_ = () => {
			PoorManIntervals.update();
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.handleOpenURL_ = (event: any) => {
			// logger.info('Sharing: handleOpenURL_: start');

			// If this is called while biometrics haven't been done yet, we can
			// ignore the call, because handleShareData() will be called once
			// biometricsDone is `true`.
			if (event.url === ShareExtension.shareURL && this.props.biometricsDone) {
				logger.info('Sharing: handleOpenURL_: Processing share data');
				void this.handleShareData();
			} else if (isCallbackUrl(event.url)) {
				logger.info('received callback url: ', event.url);
				this.callbackUrl = event.url;
				if (this.props.biometricsDone) {
					void this.handleCallbackUrl();
				}
			}
		};

		this.handleNewShare_ = () => {
			// logger.info('Sharing: handleNewShare_: start');

			// look at this.handleOpenURL_ comment
			if (this.props.biometricsDone) {
				logger.info('Sharing: handleNewShare_: Processing share data');
				void this.handleShareData();
			}
		};

		this.unsubscribeNewShareListener_ = ShareExtension.addShareListener(this.handleNewShare_);

		this.handleScreenWidthChange_ = this.handleScreenWidthChange_.bind(this);
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
	public async componentDidMount() {
		if (this.props.appState === 'starting') {
			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'initializing',
			});

			try {
				NetInfo.configure({
					reachabilityUrl: 'https://joplinapp.org/connection_check/',
					reachabilityTest: async (response) => response.status === 200,
				});

				// This will be called right after adding the event listener
				// so there's no need to check netinfo on startup
				this.unsubscribeNetInfoHandler_ = NetInfo.addEventListener(({ type, details }) => {
					const isMobile = details?.isConnectionExpensive || type === 'cellular';
					reg.setIsOnMobileData(isMobile);
					this.props.dispatch({
						type: 'MOBILE_DATA_WARNING_UPDATE',
						isOnMobileData: isMobile,
					});
				});
			} catch (error) {
				reg.logger().warn('Something went wrong while checking network info');
				reg.logger().info(error);
			}

			try {
				await initialize(this.props.dispatch);
			} catch (error) {
				alert(`Something went wrong while starting the application: ${error}`);
				this.props.dispatch({
					type: 'APP_STATE_SET',
					state: 'error',
				});
				throw error;
			}

			// https://reactnative.dev/docs/linking#handling-deep-links
			//
			// The handler added with Linking.addEventListener() is only triggered when app is already open.
			//
			// When the app is not already open and the deep link triggered app launch,
			// the URL can be obtained with Linking.getInitialURL().
			//
			// We only save the URL here since we want to show the content only
			// after biometrics check is passed or known disabled.
			const url = await Linking.getInitialURL();
			if (url && isCallbackUrl(url)) {
				logger.info('received initial callback url: ', url);
				this.callbackUrl = url;
			}

			const loadedSensorInfo = await sensorInfo();
			this.setState({ sensorInfo: loadedSensorInfo });

			// If biometrics is disabled we set biometricsDone to `true`. We do
			// it with a delay so that the component is properly mounted, and
			// the componentDidUpdate gets triggered (which in turns will handle
			// the share data, if any).
			setTimeout(() => {
				if (!biometricsEnabled(loadedSensorInfo)) {
					this.props.dispatch({
						type: 'BIOMETRICS_DONE_SET',
						value: true,
					});
				}
			}, 100);

			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'ready',
			});

			// setTimeout(() => {
			// 	this.props.dispatch({
			// 		type: 'NAV_GO',
			// 		routeName: 'ProfileSwitcher',
			// 	});
			// }, 1000);
		}

		this.urlOpenListener_ = Linking.addEventListener('url', this.handleOpenURL_);

		BackButtonService.initialize(this.backButtonHandler_);

		AlarmService.setInAppNotificationHandler(async (alarmId: string) => {
			const alarm = await Alarm.load(alarmId);
			const notification = await Alarm.makeNotification(alarm);
			void this.dropdownAlert_({
				type: 'info',
				title: notification.title,
				message: notification.body ? notification.body : '',
			});
		});

		this.appStateChangeListener_ = RNAppState.addEventListener('change', this.onAppStateChange_);
		this.unsubscribeScreenWidthChangeHandler_ = Dimensions.addEventListener('change', this.handleScreenWidthChange_);

		this.themeChangeListener_ = Appearance.addChangeListener(
			({ colorScheme }) => onSystemColorSchemeChange(colorScheme),
		);
		onSystemColorSchemeChange(Appearance.getColorScheme());

		this.quickActionShortcutListener_ = await setupQuickActions(this.props.dispatch);

		await setupNotifications(this.props.dispatch);

		this.keyboardShowListener_ = Keyboard.addListener('keyboardDidShow', () => {
			this.props.dispatch({
				type: 'KEYBOARD_VISIBLE_CHANGE',
				visible: true,
			});
		});
		this.keyboardHideListener_ = Keyboard.addListener('keyboardDidHide', () => {
			this.props.dispatch({
				type: 'KEYBOARD_VISIBLE_CHANGE',
				visible: false,
			});
		});

		// Setting.setValue('encryption.masterPassword', 'WRONG');
		// setTimeout(() => NavService.go('EncryptionConfig'), 2000);
	}

	public componentWillUnmount() {
		if (this.appStateChangeListener_) {
			this.appStateChangeListener_.remove();
			this.appStateChangeListener_ = null;
		}

		if (this.urlOpenListener_) {
			this.urlOpenListener_.remove();
			this.urlOpenListener_ = null;
		}

		if (this.themeChangeListener_) {
			this.themeChangeListener_.remove();
			this.themeChangeListener_ = null;
		}

		if (this.unsubscribeScreenWidthChangeHandler_) {
			this.unsubscribeScreenWidthChangeHandler_.remove();
			this.unsubscribeScreenWidthChangeHandler_ = null;
		}

		if (this.unsubscribeNetInfoHandler_) this.unsubscribeNetInfoHandler_();

		if (this.unsubscribeNewShareListener_) {
			this.unsubscribeNewShareListener_();
			this.unsubscribeNewShareListener_ = undefined;
		}

		if (this.quickActionShortcutListener_) {
			this.quickActionShortcutListener_.remove();
			this.quickActionShortcutListener_ = undefined;
		}

		if (this.keyboardShowListener_) {
			this.keyboardShowListener_.remove();
			this.keyboardShowListener_ = undefined;
		}
		if (this.keyboardHideListener_) {
			this.keyboardHideListener_.remove();
			this.keyboardHideListener_ = undefined;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async componentDidUpdate(prevProps: any) {
		if (this.props.biometricsDone !== prevProps.biometricsDone && this.props.biometricsDone) {
			logger.info('Sharing: componentDidUpdate: biometricsDone');
			void this.handleShareData();
			void this.handleCallbackUrl();
		}
	}

	private async backButtonHandler() {
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
	}

	private async handleShareData() {
		const sharedData = await ShareExtension.data();

		if (sharedData) {
			reg.logger().info('Received shared data');

			// selectedFolderId can be null if no screens other than "All notes"
			// have been opened.
			const targetFolder = this.props.selectedFolderId ?? (await Folder.defaultFolder())?.id;
			if (targetFolder) {
				logger.info('Sharing: handleShareData: Processing...');
				await handleShared(sharedData, targetFolder, this.props.dispatch);
			} else {
				reg.logger().info('Cannot handle share - default folder id is not set');
			}
		} else {
			logger.info('Sharing: received empty share data.');
		}
	}

	private async handleCallbackUrl() {
		const url = this.callbackUrl;
		this.callbackUrl = null;
		if (url === null) {
			return;
		}

		const { command, params } = parseCallbackUrl(url);

		// adopted from app-mobile/utils/shareHandler.ts
		// We go back one screen in case there's already a note open -
		// if we don't do this, the dispatch below will do nothing
		// (because routeName wouldn't change)
		this.props.dispatch({ type: 'NAV_BACK' });
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		switch (command) {

		case CallbackUrlCommand.OpenNote:
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: params.id,
			});
			break;

		case CallbackUrlCommand.OpenTag:
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				tagId: params.id,
			});
			break;

		case CallbackUrlCommand.OpenFolder:
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: params.id,
			});
			break;

		}
	}

	private async handleScreenWidthChange_() {
		this.setState({ sideMenuWidth: this.getSideMenuWidth() });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public UNSAFE_componentWillReceiveProps(newProps: any) {
		if (newProps.syncStarted !== this.lastSyncStarted_) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			if (!newProps.syncStarted) void refreshFolders((action: any) => this.props.dispatch(action), this.props.selectedFolderId);
			this.lastSyncStarted_ = newProps.syncStarted;
		}
	}

	private sideMenu_change(isOpen: boolean) {
		// Make sure showSideMenu property of state is updated
		// when the menu is open/closed.
		this.props.dispatch({
			type: isOpen ? 'SIDE_MENU_OPEN' : 'SIDE_MENU_CLOSE',
		});
	}

	private getSideMenuWidth = () => {
		const sideMenuWidth = getResponsiveValue({
			sm: 250,
			md: 260,
			lg: 270,
			xl: 280,
			xxl: 290,
		});

		return sideMenuWidth;
	};

	public render() {
		if (this.props.appState !== 'ready') {
			if (this.props.appState === 'error') {
				return <Text>Startup error.</Text>;
			}

			// Loading can take a particularly long time for the first time on web -- show progress.
			if (Platform.OS === 'web') {
				return <View style={{ marginLeft: 'auto', marginRight: 'auto', paddingTop: 20 }}>
					<ActivityIndicator accessibilityLabel={_('Loading...')} />
				</View>;
			} else {
				return null;
			}
		}
		const theme: Theme = themeStyle(this.props.themeId);

		let sideMenuContent: ReactNode = null;
		let menuPosition = SideMenuPosition.Left;
		let disableSideMenuGestures = this.props.disableSideMenuGestures;

		if (this.props.routeName === 'Note') {
			sideMenuContent = <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}><SideMenuContentNote options={this.props.noteSideMenuOptions}/></SafeAreaView>;
			menuPosition = SideMenuPosition.Right;
		} else if (this.props.routeName === 'Config') {
			disableSideMenuGestures = true;
		} else {
			sideMenuContent = <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}><SideMenuContent/></SafeAreaView>;
		}

		const appNavInit = {
			Notes: { screen: NotesScreen },
			Note: { screen: NoteScreen },
			Tags: { screen: TagsScreen },
			Folder: { screen: FolderScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen },
			DropboxLogin: { screen: DropboxLoginScreen },
			JoplinCloudLogin: { screen: JoplinCloudLoginScreen },
			EncryptionConfig: { screen: EncryptionConfigScreen },
			UpgradeSyncTarget: { screen: UpgradeSyncTargetScreen },
			ShareManager: { screen: ShareManager },
			ProfileSwitcher: { screen: ProfileSwitcher },
			ProfileEditor: { screen: ProfileEditor },
			Log: { screen: LogScreen },
			Status: { screen: StatusScreen },
			Search: { screen: SearchScreen },
			Config: { screen: ConfigScreen },
		};


		// const statusBarStyle = theme.appearance === 'light-content';
		const statusBarStyle = 'light-content';

		const shouldShowMainContent = !biometricsEnabled(this.state.sensorInfo) || this.props.biometricsDone;

		logger.info('root.biometrics: biometricsDone', this.props.biometricsDone);
		logger.info('root.biometrics: biometricsEnabled', biometricsEnabled(this.state.sensorInfo));
		logger.info('root.biometrics: shouldShowMainContent', shouldShowMainContent);
		logger.info('root.biometrics: this.state.sensorInfo', this.state.sensorInfo);

		// The right sidemenu can be difficult to close due to a bug in the sidemenu
		// library (right sidemenus can't be swiped closed).
		//
		// Additionally, it can interfere with scrolling in the note viewer, so we use
		// a smaller edge hit width.
		const menuEdgeHitWidth = menuPosition === 'right' ? 20 : 30;

		const mainContent = (
			<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
				<SideMenu
					menu={sideMenuContent}
					edgeHitWidth={menuEdgeHitWidth}
					toleranceX={4}
					toleranceY={20}
					openMenuOffset={this.state.sideMenuWidth}
					menuPosition={menuPosition}
					onChange={(isOpen: boolean) => this.sideMenu_change(isOpen)}
					disableGestures={disableSideMenuGestures}
				>
					<StatusBar barStyle={statusBarStyle} />
					<MenuProvider style={{ flex: 1 }}>
						<SafeAreaView style={{ flex: 0, backgroundColor: theme.backgroundColor2 }}/>
						<SafeAreaView style={{ flex: 1 }}>
							<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
								{ shouldShowMainContent && <AppNav screens={appNavInit} dispatch={this.props.dispatch} /> }
							</View>
							{/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied */}
							<DropdownAlert alert={(func: any) => (this.dropdownAlert_ = func)} />
							{ !shouldShowMainContent && <BiometricPopup
								dispatch={this.props.dispatch}
								themeId={this.props.themeId}
								sensorInfo={this.state.sensorInfo}
							/> }
						</SafeAreaView>
					</MenuProvider>
				</SideMenu>
				<PluginRunnerWebView />
				<PluginNotification/>
			</View>
		);


		const paperTheme = theme.appearance === ThemeAppearance.Dark ? MD3DarkTheme : MD3LightTheme;

		// Wrap everything in a PaperProvider -- this allows using components from react-native-paper
		return (
			<PaperProvider theme={{
				...paperTheme,
				version: 3,
				colors: {
					...paperTheme.colors,
					onPrimaryContainer: theme.color5,
					primaryContainer: theme.backgroundColor5,

					outline: theme.codeBorderColor,

					primary: theme.color4,
					onPrimary: theme.backgroundColor4,

					background: theme.backgroundColor,

					surface: theme.backgroundColor,
					onSurface: theme.color,

					secondaryContainer: theme.raisedBackgroundColor,
					onSecondaryContainer: theme.raisedColor,

					surfaceVariant: theme.backgroundColor3,
					onSurfaceVariant: theme.color3,

					elevation: {
						level0: 'transparent',
						level1: theme.oddBackgroundColor,
						level2: theme.raisedBackgroundColor,
						level3: theme.raisedBackgroundColor,
						level4: theme.raisedBackgroundColor,
						level5: theme.raisedBackgroundColor,
					},
				},
			}}>
				<DialogManager themeId={this.props.themeId}>
					{mainContent}
				</DialogManager>
			</PaperProvider>
		);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state: any) => {
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
		disableSideMenuGestures: state.disableSideMenuGestures,
		biometricsDone: state.biometricsDone,
		biometricsEnabled: state.settings['security.biometricsEnabled'],
	};
};

const App = connect(mapStateToProps)(AppComponent);

export default class Root extends React.Component {
	public render() {
		return (
			<Provider store={store}>
				<App/>
			</Provider>
		);
	}
}
