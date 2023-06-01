const React = require('react');
import shim from '@joplin/lib/shim';
shim.setReact(React);

import setupQuickActions from './setupQuickActions';
import PluginAssetsLoader from './PluginAssetsLoader';
import AlarmService from '@joplin/lib/services/AlarmService';
import Alarm from '@joplin/lib/models/Alarm';
import time from '@joplin/lib/time';
import Logger, { TargetType } from '@joplin/lib/Logger';
import BaseModel from '@joplin/lib/BaseModel';
import BaseService from '@joplin/lib/services/BaseService';
import ResourceService from '@joplin/lib/services/ResourceService';
import KvStore from '@joplin/lib/services/KvStore';
import NoteScreen from './components/screens/Note';
import UpgradeSyncTargetScreen from './components/screens/UpgradeSyncTargetScreen';
import Setting, { Env } from '@joplin/lib/models/Setting';
import PoorManIntervals from '@joplin/lib/PoorManIntervals';
import reducer from '@joplin/lib/reducer';
import ShareExtension from './utils/ShareExtension';
import handleShared from './utils/shareHandler';
import uuid from '@joplin/lib/uuid';
import { loadKeychainServiceAndSettings } from '@joplin/lib/services/SettingUtils';
import KeychainServiceDriverMobile from '@joplin/lib/services/keychain/KeychainServiceDriver.mobile';
import { setLocale } from '@joplin/lib/locale';
import SyncTargetJoplinServer from '@joplin/lib/SyncTargetJoplinServer';
import SyncTargetJoplinCloud from '@joplin/lib/SyncTargetJoplinCloud';
import SyncTargetOneDrive from '@joplin/lib/SyncTargetOneDrive';
import initProfile from '@joplin/lib/services/profileConfig/initProfile';
const VersionInfo = require('react-native-version-info').default;
const { Keyboard, BackHandler, View, StatusBar, Platform, Dimensions } = require('react-native');
import { AppState as RNAppState, EmitterSubscription, Linking, NativeEventSubscription } from 'react-native';
import getResponsiveValue from './components/getResponsiveValue';
import NetInfo from '@react-native-community/netinfo';
const DropdownAlert = require('react-native-dropdownalert').default;
const AlarmServiceDriver = require('./services/AlarmServiceDriver').default;
const SafeAreaView = require('./components/SafeAreaView');
const { connect, Provider } = require('react-redux');
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
const { BackButtonService } = require('./services/back-button.js');
import NavService from '@joplin/lib/services/NavService';
import { createStore, applyMiddleware } from 'redux';
const reduxSharedMiddleware = require('@joplin/lib/components/shared/reduxSharedMiddleware');
const { shimInit } = require('./utils/shim-init-react.js');
const { AppNav } = require('./components/app-nav.js');
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import BaseSyncTarget from '@joplin/lib/BaseSyncTarget';
const { FoldersScreenUtils } = require('@joplin/lib/folders-screen-utils.js');
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
const { TagsScreen } = require('./components/screens/tags.js');
import ConfigScreen from './components/screens/ConfigScreen';
const { FolderScreen } = require('./components/screens/folder.js');
const { LogScreen } = require('./components/screens/log.js');
const { StatusScreen } = require('./components/screens/status.js');
const { SearchScreen } = require('./components/screens/search.js');
const { OneDriveLoginScreen } = require('./components/screens/onedrive-login.js');
import EncryptionConfigScreen from './components/screens/encryption-config';
const { DropboxLoginScreen } = require('./components/screens/dropbox-login.js');
const { MenuContext } = require('react-native-popup-menu');
import { Drawer } from 'react-native-drawer-layout';
import SideMenuContent from './components/side-menu-content';
const { SideMenuContentNote } = require('./components/side-menu-content-note.js');
const { DatabaseDriverReactNative } = require('./utils/database-driver-react-native');
import { reg } from '@joplin/lib/registry';
const { defaultState } = require('@joplin/lib/reducer');
const { FileApiDriverLocal } = require('@joplin/lib/file-api-driver-local');
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import WelcomeUtils from '@joplin/lib/WelcomeUtils';
const { themeStyle } = require('./components/global-style.js');
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
const SyncTargetFilesystem = require('@joplin/lib/SyncTargetFilesystem.js');
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('@joplin/lib/SyncTargetWebDAV.js');
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3.js');
import BiometricPopup from './components/biometrics/BiometricPopup';

SyncTargetRegistry.addClass(SyncTargetNone);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetJoplinServer);
SyncTargetRegistry.addClass(SyncTargetJoplinCloud);

import FsDriverRN from './utils/fs-driver-rn';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import MigrationService from '@joplin/lib/services/MigrationService';
import { clearSharedFilesCache } from './utils/ShareUtils';
import setIgnoreTlsErrors from './utils/TlsUtils';
import ShareService from '@joplin/lib/services/share/ShareService';
import setupNotifications from './utils/setupNotifications';
import { loadMasterKeysFromSettings, migrateMasterPassword } from '@joplin/lib/services/e2ee/utils';
import SyncTargetNone from '@joplin/lib/SyncTargetNone';
import { setRSA } from '@joplin/lib/services/e2ee/ppk';
import RSA from './services/e2ee/RSA.react-native';
import { runIntegrationTests } from '@joplin/lib/services/e2ee/ppkTestUtils';
import { Theme, ThemeAppearance } from '@joplin/lib/themes/type';
import { AppState } from './utils/types';
import ProfileSwitcher from './components/ProfileSwitcher/ProfileSwitcher';
import ProfileEditor from './components/ProfileSwitcher/ProfileEditor';
import sensorInfo from './components/biometrics/sensorInfo';
import { getCurrentProfile } from '@joplin/lib/services/profileConfig';
import { getDatabaseName, getProfilesRootDir, getResourceDir, setDispatch } from './services/profiles';
import { ReactNode } from 'react';

type SideMenuPosition = 'left' | 'right';

const logger = Logger.create('root');

let storeDispatch = function(_action: any) {};

const logReducerAction = function(action: any) {
	if (['SIDE_MENU_OPEN_PERCENT', 'SYNC_REPORT_UPDATE'].indexOf(action.type) >= 0) return;

	const msg = [action.type];
	if (action.routeName) msg.push(action.routeName);

	// reg.logger().debug('Reducer action', msg.join(', '));
};

const generalMiddleware = (store: any) => (next: any) => async (action: any) => {
	logReducerAction(action);
	PoorManIntervals.update(); // This function needs to be called regularly so put it here

	const result = next(action);
	const newState = store.getState();

	await reduxSharedMiddleware(store, next, action);

	if (action.type === 'NAV_GO') Keyboard.dismiss();

	if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
		if (!await reg.syncTarget().syncStarted()) void reg.scheduleSync(1000, { syncSteps: ['update_remote', 'delete_remote'] }, true);
		SearchEngine.instance().scheduleSyncTables();
	}

	if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
		await AlarmService.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'sync.interval' || action.type === 'SETTING_UPDATE_ALL') {
		reg.setupRecurrentSync();
	}

	if ((action.type === 'SETTING_UPDATE_ONE' && (action.key === 'dateFormat' || action.key === 'timeFormat')) || (action.type === 'SETTING_UPDATE_ALL')) {
		time.setDateFormat(Setting.value('dateFormat'));
		time.setTimeFormat(Setting.value('timeFormat'));
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'locale' || action.type === 'SETTING_UPDATE_ALL') {
		setLocale(Setting.value('locale'));
	}

	if ((action.type === 'SETTING_UPDATE_ONE' && (action.key.indexOf('encryption.') === 0)) || (action.type === 'SETTING_UPDATE_ALL')) {
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

	if (action.type === 'NAV_GO' && action.routeName === 'Notes') {
		Setting.setValue('activeFolderId', newState.selectedFolderId);
	}

	if (action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
		void DecryptionWorker.instance().scheduleStart();
	}

	if (action.type === 'SYNC_CREATED_OR_UPDATED_RESOURCE') {
		void ResourceFetcher.instance().autoAddResources();
	}

	return result;
};

const navHistory: any[] = [];

function historyCanGoBackTo(route: any) {
	if (route.routeName === 'Note') return false;
	if (route.routeName === 'Folder') return false;

	// There's no point going back to these screens in general and, at least in OneDrive case,
	// it can be buggy to do so, due to incorrectly relying on global state (reg.syncTarget...)
	if (route.routeName === 'OneDriveLogin') return false;
	if (route.routeName === 'DropboxLogin') return false;

	return true;
}

const DEFAULT_ROUTE = {
	type: 'NAV_GO',
	routeName: 'Notes',
	smartFilterId: 'c3176726992c11e9ac940492261af972',
};

const appDefaultState: AppState = { ...defaultState, sideMenuOpenPercent: 0,
	route: DEFAULT_ROUTE,
	noteSelectionEnabled: false,
	noteSideMenuOptions: null,
	isOnMobileData: false };

const appReducer = (state = appDefaultState, action: any) => {
	let newState = state;
	let historyGoingBack = false;

	try {
		switch (action.type) {

		// @ts-ignore
		case 'NAV_BACK':

		{
			if (!navHistory.length) break;

			let newAction = null;
			while (navHistory.length) {
				newAction = navHistory.pop();
				if (newAction.routeName !== state.route.routeName) break;
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
					if (currentRoute.routeName === action.routeName) {
					// nothing
					} else {
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
					if (n.routeName === action.routeName) {
						navHistory[i] = { ...action };
					}
				}

				newState = { ...state };

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
					newState.smartFilterId = action.smartFilterId;
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

		case 'SIDE_MENU_OPEN_PERCENT':

			newState = { ...state };
			newState.sideMenuOpenPercent = action.value;
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

		case 'MOBILE_DATA_WARNING_UPDATE':

			newState = { ...state };
			newState.isOnMobileData = action.isOnMobileData;
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

function resourceFetcher_downloadComplete(event: any) {
	if (event.encrypted) {
		void DecryptionWorker.instance().scheduleStart();
	}
}

function decryptionWorker_resourceMetadataButNotBlobDecrypted() {
	ResourceFetcher.instance().scheduleAutoAddResources();
}

async function initialize(dispatch: Function) {
	shimInit();

	setDispatch(dispatch);
	const { profileConfig, isSubProfile } = await initProfile(getProfilesRootDir());
	const currentProfile = getCurrentProfile(profileConfig);

	dispatch({
		type: 'PROFILE_CONFIG_SET',
		value: profileConfig,
	});

	// @ts-ignore
	Setting.setConstant('env', __DEV__ ? 'dev' : 'prod');
	Setting.setConstant('appId', 'net.cozic.joplin-mobile');
	Setting.setConstant('appType', 'mobile');
	const resourceDir = getResourceDir(currentProfile, isSubProfile);
	Setting.setConstant('resourceDir', resourceDir);

	await shim.fsDriver().mkdir(resourceDir);

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

	reg.setLogger(mainLogger);
	reg.setShowErrorMessageBoxHandler((message: string) => { alert(message); });

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

	AlarmService.setDriver(new AlarmServiceDriver(mainLogger));
	AlarmService.setLogger(mainLogger);

	setRSA(RSA);

	try {
		if (Setting.value('env') === 'prod') {
			await db.open({ name: getDatabaseName(currentProfile, isSubProfile) });
		} else {
			await db.open({ name: getDatabaseName(currentProfile, isSubProfile, '-3') });

			// await db.clearForTesting();
		}

		reg.logger().info('Database is ready.');
		reg.logger().info('Loading settings...');

		await loadKeychainServiceAndSettings(KeychainServiceDriverMobile);
		await migrateMasterPassword();

		if (!Setting.value('clientId')) Setting.setValue('clientId', uuid.create());
		reg.logger().info(`Client ID: ${Setting.value('clientId')}`);


		if (Setting.value('firstStart')) {
			const detectedLocale = shim.detectAndSetLocale(Setting);
			reg.logger().info(`First start: detected locale as ${detectedLocale}`);

			Setting.skipDefaultMigrations();
			Setting.setValue('firstStart', 0);
		} else {
			Setting.applyDefaultMigrations();
		}

		if (Setting.value('env') === Env.Dev) {
			// Setting.setValue('sync.10.path', 'https://api.joplincloud.com');
			// Setting.setValue('sync.10.userContentPath', 'https://joplinusercontent.com');
			Setting.setValue('sync.10.path', 'http://api.joplincloud.local:22300');
			Setting.setValue('sync.10.userContentPath', 'http://joplinusercontent.local:22300');

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

		PluginAssetsLoader.instance().setLogger(mainLogger);
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

		await FoldersScreenUtils.refreshFolders();

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

		const folderId = Setting.value('activeFolderId');
		let folder = await Folder.load(folderId);

		if (!folder) folder = await Folder.defaultFolder();

		dispatch({
			type: 'FOLDER_SET_COLLAPSED_ALL',
			ids: Setting.value('collapsedFolderIds'),
		});

		if (!folder) {
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
	if (Setting.value('env') === 'dev') await runIntegrationTests();

	reg.logger().info('Application initialized');
}

class AppComponent extends React.Component {

	private urlOpenListener_: EmitterSubscription|null = null;
	private appStateChangeListener_: NativeEventSubscription|null = null;

	public constructor() {
		super();

		this.state = {
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

		this.handleOpenURL_ = (event: any) => {
			// logger.info('Sharing: handleOpenURL_: start');

			// If this is called while biometrics haven't been done yet, we can
			// ignore the call, because handleShareData() will be called once
			// biometricsDone is `true`.
			if (event.url === ShareExtension.shareURL && this.props.biometricsDone) {
				logger.info('Sharing: handleOpenURL_: Processing share data');
				void this.handleShareData();
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
					const isMobile = details.isConnectionExpensive || type === 'cellular';
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

			await initialize(this.props.dispatch);

			this.setState({ sensorInfo: await sensorInfo() });

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
			this.dropdownAlert_.alertWithType('info', notification.title, notification.body ? notification.body : '');
		});

		this.appStateChangeListener_ = RNAppState.addEventListener('change', this.onAppStateChange_);
		this.unsubscribeScreenWidthChangeHandler_ = Dimensions.addEventListener('change', this.handleScreenWidthChange_);

		setupQuickActions(this.props.dispatch, this.props.selectedFolderId);

		await setupNotifications(this.props.dispatch);

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

		if (this.unsubscribeScreenWidthChangeHandler_) {
			this.unsubscribeScreenWidthChangeHandler_.remove();
			this.unsubscribeScreenWidthChangeHandler_ = null;
		}

		if (this.unsubscribeNetInfoHandler_) this.unsubscribeNetInfoHandler_();

		if (this.unsubscribeNewShareListener_) {
			this.unsubscribeNewShareListener_();
			this.unsubscribeNewShareListener_ = undefined;
		}
	}

	public async componentDidUpdate(prevProps: any) {
		if (this.props.biometricsDone !== prevProps.biometricsDone && this.props.biometricsDone) {
			logger.info('Sharing: componentDidUpdate: biometricsDone');
			void this.handleShareData();
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

		logger.info('Sharing: handleShareData:', sharedData);

		if (sharedData) {
			reg.logger().info('Received shared data');
			if (this.props.selectedFolderId) {
				logger.info('Sharing: handleShareData: Processing...');
				await handleShared(sharedData, this.props.selectedFolderId, this.props.dispatch);
			} else {
				reg.logger().info('Cannot handle share - default folder id is not set');
			}
		}
	}

	private async handleScreenWidthChange_() {
		this.setState({ sideMenuWidth: this.getSideMenuWidth() });
	}

	public UNSAFE_componentWillReceiveProps(newProps: any) {
		if (newProps.syncStarted !== this.lastSyncStarted_) {
			if (!newProps.syncStarted) FoldersScreenUtils.refreshFolders();
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
		if (this.props.appState !== 'ready') return null;
		const theme: Theme = themeStyle(this.props.themeId);

		let sideMenuContent: ReactNode = null;
		let menuPosition: SideMenuPosition = 'left';

		if (this.props.routeName === 'Note') {
			sideMenuContent = <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}><SideMenuContentNote options={this.props.noteSideMenuOptions}/></SafeAreaView>;
			menuPosition = 'right';
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
			EncryptionConfig: { screen: EncryptionConfigScreen },
			UpgradeSyncTarget: { screen: UpgradeSyncTargetScreen },
			ProfileSwitcher: { screen: ProfileSwitcher },
			ProfileEditor: { screen: ProfileEditor },
			Log: { screen: LogScreen },
			Status: { screen: StatusScreen },
			Search: { screen: SearchScreen },
			Config: { screen: ConfigScreen },
		};


		// const statusBarStyle = theme.appearance === 'light-content';
		const statusBarStyle = 'light-content';

		const biometricIsEnabled = !!this.state.sensorInfo && this.state.sensorInfo.enabled;
		const shouldShowMainContent = !biometricIsEnabled || this.props.biometricsDone;

		logger.info('root.biometrics: biometricsDone', this.props.biometricsDone);
		logger.info('root.biometrics: biometricIsEnabled', biometricIsEnabled);
		logger.info('root.biometrics: shouldShowMainContent', shouldShowMainContent);
		logger.info('root.biometrics: this.state.sensorInfo', this.state.sensorInfo);

		const mainContent = (
			<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
				<Drawer
					// Need to reset the key here based on menu position, otherwise
					// the drawer will flash open on screen and close every time the
					// drawer position switches (i.e. when opening or closing a note)
					key={`main-drawer-${menuPosition}`}
					open={this.props.showSideMenu}
					onOpen={() => this.sideMenu_change(true)}
					onClose={() => this.sideMenu_change(false)}
					drawerPosition={menuPosition}
					swipeEdgeWidth={15}
					drawerStyle={{
						width: this.state.sideMenuWidth,
					}}
					renderDrawerContent={() => sideMenuContent}
				>
					<StatusBar barStyle={statusBarStyle} />
					<MenuContext style={{ flex: 1 }}>
						<SafeAreaView style={{ flex: 0, backgroundColor: theme.backgroundColor2 }}/>
						<SafeAreaView style={{ flex: 1 }}>
							<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
								{ shouldShowMainContent && <AppNav screens={appNavInit} dispatch={this.props.dispatch} /> }
							</View>
							<DropdownAlert ref={(ref: any) => this.dropdownAlert_ = ref} tapToCloseEnabled={true} />
							{ !shouldShowMainContent && <BiometricPopup
								dispatch={this.props.dispatch}
								themeId={this.props.themeId}
								sensorInfo={this.state.sensorInfo}
							/> }
						</SafeAreaView>
					</MenuContext>
				</Drawer>
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
					surfaceVariant: theme.backgroundColor,
					onSurfaceVariant: theme.color,
					primary: theme.color,
				},
			}}>
				{mainContent}
			</PaperProvider>
		);
	}
}

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
