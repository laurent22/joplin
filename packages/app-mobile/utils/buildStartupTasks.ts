import PluginAssetsLoader from '../PluginAssetsLoader';
import AlarmService from '@joplin/lib/services/AlarmService';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import BaseModel from '@joplin/lib/BaseModel';
import BaseService from '@joplin/lib/services/BaseService';
import ResourceService from '@joplin/lib/services/ResourceService';
import KvStore from '@joplin/lib/services/KvStore';
import Setting, { AppType, Env } from '@joplin/lib/models/Setting';
import PoorManIntervals from '@joplin/lib/PoorManIntervals';
import { parseNotesParent } from '@joplin/lib/reducer';
import uuid from '@joplin/lib/uuid';
import { loadKeychainServiceAndSettings } from '@joplin/lib/services/SettingUtils';
import { setLocale } from '@joplin/lib/locale';
import SyncTargetJoplinServer from '@joplin/lib/SyncTargetJoplinServer';
import SyncTargetJoplinCloud from '@joplin/lib/SyncTargetJoplinCloud';
import SyncTargetOneDrive from '@joplin/lib/SyncTargetOneDrive';
import initProfile from '@joplin/lib/services/profileConfig/initProfile';
const VersionInfo = require('react-native-version-info').default;
const AlarmServiceDriver = require('../services/AlarmServiceDriver').default;
import NavService from '@joplin/lib/services/NavService';
import { Dispatch, Store } from 'redux';
import shimInit from '../utils/shim-init-react';
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
import { reg } from '@joplin/lib/registry';
import FileApiDriverLocal from '@joplin/lib/file-api-driver-local';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import WelcomeUtils from '@joplin/lib/WelcomeUtils';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import SyncTargetFilesystem from '@joplin/lib/SyncTargetFilesystem';
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('@joplin/lib/SyncTargetWebDAV.js');
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3.js');
import SyncTargetJoplinServerSAML from '@joplin/lib/SyncTargetJoplinServerSAML';
import initLib from '@joplin/lib/initLib';

import SyncTargetNone from '@joplin/lib/SyncTargetNone';

const logger = Logger.create('buildStartupTasks');

SyncTargetRegistry.addClass(SyncTargetNone);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetJoplinServer);
SyncTargetRegistry.addClass(SyncTargetJoplinServerSAML);
SyncTargetRegistry.addClass(SyncTargetJoplinCloud);

import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import MigrationService from '@joplin/lib/services/MigrationService';
import { clearSharedFilesCache } from '../utils/ShareUtils';
import setIgnoreTlsErrors from '../utils/TlsUtils';
import ShareService from '@joplin/lib/services/share/ShareService';
import { loadMasterKeysFromSettings, migrateMasterPassword, migratePpk } from '@joplin/lib/services/e2ee/utils';
import { setRSA } from '@joplin/lib/services/e2ee/ppk/ppk';
import RSA from '../services/e2ee/RSA.react-native';
import { runIntegrationTests as runRsaIntegrationTests } from '@joplin/lib/services/e2ee/ppk/ppkTestUtils';
import { runIntegrationTests as runCryptoIntegrationTests } from '@joplin/lib/services/e2ee/cryptoTestUtils';
import { getCurrentProfile } from '@joplin/lib/services/profileConfig';
import { getDatabaseName, getPluginDataDir, getProfilesRootDir, getResourceDir } from '../services/profiles';
import userFetcher, { initializeUserFetcher } from '@joplin/lib/utils/userFetcher';
import { parseShareCache } from '@joplin/lib/services/share/reducer';
import runOnDeviceFsDriverTests from '../utils/fs-driver/runOnDeviceTests';
import { refreshFolders } from '@joplin/lib/folders-screen-utils';
import KeymapService from '@joplin/lib/services/KeymapService';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import initializeCommandService from '../utils/initializeCommandService';
import PlatformImplementation from '../services/plugins/PlatformImplementation';
import { DEFAULT_ROUTE } from '../utils/appDefaultState';
import DatabaseDriverReactNative from '../utils/database-driver-react-native';
import lockToSingleInstance from '../utils/lockToSingleInstance';
import { AppState } from '../utils/types';
import PerformanceLogger from '@joplin/lib/PerformanceLogger';
import { Profile } from '@joplin/lib/services/profileConfig/types';
import shim from '@joplin/lib/shim';
import { Platform } from 'react-native';
import VoiceTyping from '../services/voiceTyping/VoiceTyping';
import whisper from '../services/voiceTyping/whisper';


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

const buildStartupTasks = (
	dispatch: Dispatch, store: Store<AppState>,
) => {
	type StartupTask = [string, ()=> Promise<void>];
	const startupTasks: StartupTask[] = [];
	const addTask = (name: string, task: ()=> Promise<void>) => {
		startupTasks.push([name, task]);
	};

	let logDatabase: Database;
	let db: JoplinDatabase;
	let isSubProfile: boolean;
	let currentProfile: Profile;
	let singleInstanceLock: Promise<void>;


	addTask('buildStartupTasks/prepare single instance lock', async () => {
		// The single instance lock involves waiting for messages -- start checking
		// the lock as early as possible.
		singleInstanceLock = lockToSingleInstance();
	});

	addTask('buildStartupTasks/shimInit', async () => {
		shimInit();
	});
	addTask('buildStartupTasks/initProfile', async () => {
		const profile = await initProfile(getProfilesRootDir());
		isSubProfile = profile.isSubProfile;
		currentProfile = getCurrentProfile(profile.profileConfig);

		dispatch({
			type: 'PROFILE_CONFIG_SET',
			value: profile.profileConfig,
		});
	});
	addTask('buildStartupTasks/set constants', async () => {
		Setting.setConstant('env', __DEV__ ? Env.Dev : Env.Prod);
		Setting.setConstant('appId', 'net.cozic.joplin-mobile');
		Setting.setConstant('appType', AppType.Mobile);
		Setting.setConstant('tempDir', await initializeTempDir());
		Setting.setConstant('cacheDir', `${getProfilesRootDir()}/cache`);
		const resourceDir = getResourceDir(currentProfile, isSubProfile);
		Setting.setConstant('resourceDir', resourceDir);
		Setting.setConstant('pluginAssetDir', `${Setting.value('resourceDir')}/pluginAssets`);
		Setting.setConstant('pluginDir', `${getProfilesRootDir()}/plugins`);
		Setting.setConstant('pluginDataDir', getPluginDataDir(currentProfile, isSubProfile));
		Setting.setConstant('sync.9.apiKey', '');
		Setting.setConstant('sync.10.apiKey', '');
		Setting.setConstant('sync.11.apiKey', '');
	});
	addTask('buildStartupTasks/make resource directory', async () => {
		await shim.fsDriver().mkdir(Setting.value('resourceDir'));
	});
	addTask('buildStartupTasks/singleInstanceLock', async () => {
		// Do as much setup as possible before checking the lock -- the lock intentionally waits for
		// messages from other clients for several hundred ms.
		await singleInstanceLock;
	});
	addTask('buildStartupTasks/set up logger', async () => {
		logDatabase = new Database(new DatabaseDriverReactNative());
		await logDatabase.open({ name: 'log.sqlite' });
		await logDatabase.exec(Logger.databaseCreateTableSql());

		const mainLogger = new Logger();
		mainLogger.addTarget(TargetType.Database, { database: logDatabase, source: 'm' });
		mainLogger.setLevel(Logger.LEVEL_INFO);
		mainLogger.addTarget(TargetType.Console);
		mainLogger.setLevel(Setting.value('env') === 'dev' ? LogLevel.Debug : LogLevel.Info);

		Logger.initializeGlobalLogger(mainLogger);
		initLib(mainLogger);
		reg.setLogger(mainLogger);
		BaseService.logger_ = mainLogger;
		PerformanceLogger.setLogger(mainLogger);
	});
	addTask('buildStartupTasks/set up database', async () => {
		reg.setShowErrorMessageBoxHandler((message: string) => { alert(message); });
		reg.setDispatch(dispatch);

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

		db = new JoplinDatabase(new DatabaseDriverReactNative());
		db.setLogger(dbLogger);
		reg.setDb(db);
	});
	addTask('buildStartupTasks/initialize item classes', async () => {
		// reg.dispatch = dispatch;
		BaseModel.dispatch = dispatch;
		BaseSyncTarget.dispatch = dispatch;
		NavService.dispatch = dispatch;
		BaseModel.setDb(reg.db());
		KvStore.instance().setDb(reg.db());

		BaseItem.loadClass('Note', Note);
		BaseItem.loadClass('Folder', Folder);
		BaseItem.loadClass('Resource', Resource);
		BaseItem.loadClass('Tag', Tag);
		BaseItem.loadClass('NoteTag', NoteTag);
		BaseItem.loadClass('MasterKey', MasterKey);
		BaseItem.loadClass('Revision', Revision);

		BaseItem.revisionService_ = RevisionService.instance();

		Resource.fsDriver_ = shim.fsDriver();
		FileApiDriverLocal.fsDriver_ = shim.fsDriver();
	});
	addTask('buildStartupTasks/initializeAlarmService', async () => {
		AlarmService.setLogger(reg.logger());
		AlarmService.setDriver(new AlarmServiceDriver(reg.logger()));
	});
	addTask('buildStartupTasks/openDatabase', async () => {
		if (Setting.value('env') === 'prod') {
			await db.open({ name: getDatabaseName(currentProfile, isSubProfile) });
		} else {
			await db.open({ name: getDatabaseName(currentProfile, isSubProfile, '-20240127-1') });

			// await db.clearForTesting();
		}
	});
	addTask('buildStartupTasks/setUpSettings', async () => {
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

			Setting.skipMigrations();
			Setting.setValue('firstStart', false);
		} else {
			await Setting.applyMigrations();
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
	});
	addTask('buildStartupTasks/import plugin assets', async () => {
		await PluginAssetsLoader.instance().importAssets();
	});
	addTask('buildStartupTasks/set up command & keymap services', async () => {
		initializeCommandService(store);
		KeymapService.instance().initialize();
	});
	addTask('buildStartupTasks/set up E2EE', async () => {
		setRSA(RSA);

		EncryptionService.fsDriver_ = shim.fsDriver();
		// eslint-disable-next-line require-atomic-updates
		BaseItem.encryptionService_ = EncryptionService.instance();
		BaseItem.shareService_ = ShareService.instance();
		Resource.shareService_ = ShareService.instance();
		DecryptionWorker.instance().dispatch = dispatch;
		DecryptionWorker.instance().setLogger(reg.logger());
		DecryptionWorker.instance().setKvStore(KvStore.instance());
		DecryptionWorker.instance().setEncryptionService(EncryptionService.instance());
		await loadMasterKeysFromSettings(EncryptionService.instance());
		DecryptionWorker.instance().on('resourceMetadataButNotBlobDecrypted', decryptionWorker_resourceMetadataButNotBlobDecrypted);
	});
	addTask('buildStartupTasks/set up sharing', async () => {
		await ShareService.instance().initialize(store, EncryptionService.instance());
	});
	addTask('buildStartupTasks/migrate PPK', async () => {
		await migratePpk();
	});
	addTask('buildStartupTasks/set up voice typing', async () => {
		VoiceTyping.initialize([whisper]);
	});
	addTask('buildStartupTasks/load folders', async () => {
		await refreshFolders(dispatch, '');

		dispatch({
			type: 'FOLDER_SET_COLLAPSED_ALL',
			ids: Setting.value('collapsedFolderIds'),
		});
	});
	addTask('buildStartupTasks/load tags', async () => {
		const tags = await Tag.allWithNotes();

		dispatch({
			type: 'TAG_UPDATE_ALL',
			items: tags,
		});
	});
	addTask('buildStartupTasks/clear shared files cache', clearSharedFilesCache);
	addTask('buildStartupTasks/go: initial route', async () => {
		const folder = await getInitialActiveFolder();

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
	});
	addTask('buildStartupTasks/set up search', async () => {
		SearchEngine.instance().setDb(reg.db());
		SearchEngine.instance().setLogger(reg.logger());
		SearchEngine.instance().scheduleSyncTables();
	});
	addTask('buildStartupTasks/run migrations', async () => {
		await MigrationService.instance().run();
	});
	addTask('buildStartupTasks/set up background tasks', async () => {
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

		// Collect revisions more frequently on mobile because it doesn't auto-save
		// and it cannot collect anything when the app is not active.
		RevisionService.instance().runInBackground(1000 * 30);

		reg.setupRecurrentSync();

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
	});
	addTask('buildStartupTasks/set up welcome utils', async () => {
		await WelcomeUtils.install(Setting.value('locale'), dispatch);
	});
	addTask('buildStartupTasks/set up plugin service', async () => {
		// Even if there are no plugins, we need to initialize the PluginService so that
		// plugin search can work.
		const platformImplementation = PlatformImplementation.instance();
		PluginService.instance().initialize(
			platformImplementation.versionInfo.version, platformImplementation, null, store,
		);

		// On startup, we can clear plugin update state -- plugins that were updated when the
		// user last ran the app have been updated and will be reloaded.
		const pluginService = PluginService.instance();
		const pluginSettings = pluginService.unserializePluginSettings(Setting.value('plugins.states'));

		const updatedSettings = pluginService.clearUpdateState(pluginSettings);
		Setting.setValue('plugins.states', updatedSettings);
	});
	addTask('buildStartupTasks/run startup tests', async () => {
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
			await runRsaIntegrationTests();
			await runCryptoIntegrationTests();
			await runOnDeviceFsDriverTests();
		}

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
	});
	addTask('buildStartupTasks/optionally show sync wizard', async () => {
		if (Setting.value('sync.wizard.autoShowOnStartup') && Setting.value('sync.target') === 0) {
			dispatch({
				type: 'SYNC_WIZARD_VISIBLE_CHANGE',
				visible: true,
			});
		}
	});

	return startupTasks;
};

export default buildStartupTasks;
