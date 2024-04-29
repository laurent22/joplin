import Setting, { Env } from './models/Setting';
import Logger, { TargetType, LoggerWrapper } from '@joplin/utils/Logger';
import shim from './shim';
const { setupProxySettings } = require('./shim-init-node');
import BaseService from './services/BaseService';
import reducer, { getNotesParent, serializeNotesParent, setStore, State } from './reducer';
import KeychainServiceDriver from './services/keychain/KeychainServiceDriver.node';
import KeychainServiceDriverDummy from './services/keychain/KeychainServiceDriver.dummy';
import { setLocale } from './locale';
import KvStore from './services/KvStore';
import SyncTargetJoplinServer from './SyncTargetJoplinServer';
import SyncTargetOneDrive from './SyncTargetOneDrive';
import { createStore, applyMiddleware, Store } from 'redux';
const { defaultState, stateUtils } = require('./reducer');
import JoplinDatabase from './JoplinDatabase';
import { cancelTimers as folderScreenUtilsCancelTimers, refreshFolders, scheduleRefreshFolders } from './folders-screen-utils';
const { DatabaseDriverNode } = require('./database-driver-node.js');
import BaseModel from './BaseModel';
import Folder from './models/Folder';
import BaseItem from './models/BaseItem';
import Note from './models/Note';
import Tag from './models/Tag';
import { splitCommandString } from '@joplin/utils';
import { reg } from './registry';
import time from './time';
import BaseSyncTarget from './BaseSyncTarget';
import reduxSharedMiddleware from './components/shared/reduxSharedMiddleware';
import dns = require('dns');
import fs = require('fs-extra');
const EventEmitter = require('events');
const syswidecas = require('./vendor/syswide-cas');
import SyncTargetRegistry from './SyncTargetRegistry';
import SyncTargetFilesystem from './SyncTargetFilesystem';
const SyncTargetNextcloud = require('./SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('./SyncTargetWebDAV.js');
const SyncTargetDropbox = require('./SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('./SyncTargetAmazonS3.js');
import EncryptionService from './services/e2ee/EncryptionService';
import ResourceFetcher from './services/ResourceFetcher';
import SearchEngineUtils from './services/search/SearchEngineUtils';
import SearchEngine, { ProcessResultsRow } from './services/search/SearchEngine';
import RevisionService from './services/RevisionService';
import ResourceService from './services/ResourceService';
import DecryptionWorker from './services/DecryptionWorker';
import { loadKeychainServiceAndSettings } from './services/SettingUtils';
import MigrationService from './services/MigrationService';
import ShareService from './services/share/ShareService';
import handleSyncStartupOperation from './services/synchronizer/utils/handleSyncStartupOperation';
import SyncTargetJoplinCloud from './SyncTargetJoplinCloud';
const { setAutoFreeze } = require('immer');
import { getEncryptionEnabled } from './services/synchronizer/syncInfoUtils';
import { loadMasterKeysFromSettings, migrateMasterPassword } from './services/e2ee/utils';
import SyncTargetNone from './SyncTargetNone';
import { setRSA } from './services/e2ee/ppk';
import RSA from './services/e2ee/RSA.node';
import Resource from './models/Resource';
import { ProfileConfig } from './services/profileConfig/types';
import initProfile from './services/profileConfig/initProfile';
import { parseShareCache } from './services/share/reducer';
import RotatingLogs from './RotatingLogs';
import { NoteEntity } from './services/database/types';
import { join } from 'path';
import processStartFlags from './utils/processStartFlags';
import { setupAutoDeletion } from './services/trash/permanentlyDeleteOldItems';
import determineProfileAndBaseDir from './determineBaseAppDirs';

const appLogger: LoggerWrapper = Logger.create('App');

// const ntpClient = require('./vendor/ntp-client');
// ntpClient.dgram = require('dgram');

export interface StartOptions {
	keychainEnabled?: boolean;
	setupGlobalLogger?: boolean;
	rootProfileDir?: string;
	appName?: string;
	appId?: string;
}
export const safeModeFlagFilename = 'force-safe-mode-on-next-start';

export default class BaseApplication {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private eventEmitter_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private scheduleAutoAddResourcesIID_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private database_: any = null;
	private profileConfig_: ProfileConfig = null;

	protected showStackTraces_ = false;
	protected showPromptString_ = false;

	// Note: this is basically a cache of state.selectedFolderId. It should *only*
	// be derived from the state and not set directly since that would make the
	// state and UI out of sync.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected currentFolder_: any = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected store_: Store<any> = null;

	private rotatingLogs: RotatingLogs;

	public constructor() {
		this.eventEmitter_ = new EventEmitter();
		this.decryptionWorker_resourceMetadataButNotBlobDecrypted = this.decryptionWorker_resourceMetadataButNotBlobDecrypted.bind(this);
	}

	public async destroy() {
		if (this.scheduleAutoAddResourcesIID_) {
			shim.clearTimeout(this.scheduleAutoAddResourcesIID_);
			this.scheduleAutoAddResourcesIID_ = null;
		}
		await ResourceFetcher.instance().destroy();
		await SearchEngine.instance().destroy();
		await DecryptionWorker.instance().destroy();
		await folderScreenUtilsCancelTimers();
		await BaseItem.revisionService_.cancelTimers();
		await ResourceService.instance().cancelTimers();
		await reg.cancelTimers();

		this.eventEmitter_.removeAllListeners();
		KvStore.destroyInstance();
		BaseModel.setDb(null);
		reg.setDb(null);

		BaseItem.revisionService_ = null;
		RevisionService.instance_ = null;
		ResourceService.instance_ = null;
		ResourceService.isRunningInBackground_ = false;
		// ResourceService.isRunningInBackground_ = false;
		ResourceFetcher.instance_ = null;
		EncryptionService.instance_ = null;
		DecryptionWorker.instance_ = null;

		appLogger.info('Base application terminated...');
		this.eventEmitter_ = null;
		this.decryptionWorker_resourceMetadataButNotBlobDecrypted = null;
	}

	public logger(): LoggerWrapper {
		return appLogger;
	}

	public store() {
		return this.store_;
	}

	public currentFolder() {
		return this.currentFolder_;
	}

	public async refreshCurrentFolder() {
		let newFolder = null;

		if (this.currentFolder_) newFolder = await Folder.load(this.currentFolder_.id);
		if (!newFolder) newFolder = await Folder.defaultFolder();

		this.switchCurrentFolder(newFolder);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public switchCurrentFolder(folder: any) {
		if (!this.hasGui()) {
			this.currentFolder_ = { ...folder };
			Setting.setValue('activeFolderId', folder ? folder.id : '');
		} else {
			this.dispatch({
				type: 'FOLDER_SELECT',
				id: folder ? folder.id : '',
			});
		}
	}

	// Handles the initial flags passed to main script and
	// returns the remaining args.
	private async handleStartFlags_(argv: string[], setDefaults = true) {
		const flags = await processStartFlags(argv, setDefaults);

		if (flags.matched.showStackTraces) {
			this.showStackTraces_ = true;
		}

		// Work around issues with ipv6 resolution -- default to ipv4first.
		// (possibly incorrect URL serialization see https://github.com/mswjs/msw/issues/1388#issuecomment-1241180921).
		// See also https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
		if (flags.matched.allowOverridingDnsResultOrder) {
			dns.setDefaultResultOrder('ipv4first');
		}

		return {
			matched: flags.matched,
			argv: flags.argv,
		};
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	public async exit(code = 0) {
		await Setting.saveAll();
		process.exit(code);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async refreshNotes(state: any, useSelectedNoteId = false, noteHash = '') {
		let parentType = state.notesParentType;
		let parentId = null;

		if (parentType === 'Folder') {
			parentId = state.selectedFolderId;
			parentType = BaseModel.TYPE_FOLDER;
		} else if (parentType === 'Tag') {
			parentId = state.selectedTagId;
			parentType = BaseModel.TYPE_TAG;
		} else if (parentType === 'Search') {
			parentId = state.selectedSearchId;
			parentType = BaseModel.TYPE_SEARCH;
		} else if (parentType === 'SmartFilter') {
			parentId = state.selectedSmartFilterId;
			parentType = BaseModel.TYPE_SMART_FILTER;
		}

		appLogger.debug('Refreshing notes:', parentType, parentId);

		const options = {
			order: stateUtils.notesOrder(state.settings),
			uncompletedTodosOnTop: Setting.value('uncompletedTodosOnTop'),
			showCompletedTodos: Setting.value('showCompletedTodos'),
			caseInsensitive: true,
		};

		const source = JSON.stringify({
			options: options,
			parentId: parentId,
		});

		let notes: NoteEntity[] = [];
		let highlightedWords: string[] = [];
		let searchResults: ProcessResultsRow[] = [];

		if (parentId) {
			if (parentType === Folder.modelType()) {
				notes = await Note.previews(parentId, options);
			} else if (parentType === Tag.modelType()) {
				notes = await Tag.notes(parentId, options);
			} else if (parentType === BaseModel.TYPE_SEARCH) {
				const search = BaseModel.byId(state.searches, parentId);
				const response = await SearchEngineUtils.notesForQuery(search.query_pattern, true, { appendWildCards: true });
				notes = response.notes;
				searchResults = response.results;
				const parsedQuery = await SearchEngine.instance().parseQuery(search.query_pattern);
				highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);
			} else if (parentType === BaseModel.TYPE_SMART_FILTER) {
				notes = await Note.previews(parentId, options);
			}
		}

		this.store().dispatch({
			type: 'SET_HIGHLIGHTED',
			words: highlightedWords,
		});

		this.store().dispatch({
			type: 'SEARCH_RESULTS_SET',
			value: searchResults,
		});

		this.store().dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});

		if (useSelectedNoteId) {
			this.store().dispatch({
				type: 'NOTE_SELECT',
				id: state.selectedNoteIds && state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
				hash: noteHash,
			});
		} else {
			const lastSelectedNoteIds = stateUtils.lastSelectedNoteIds(state);
			const foundIds = [];
			for (let i = 0; i < lastSelectedNoteIds.length; i++) {
				const noteId = lastSelectedNoteIds[i];
				let found = false;
				for (let j = 0; j < notes.length; j++) {
					if (notes[j].id === noteId) {
						found = true;
						break;
					}
				}
				if (found) foundIds.push(noteId);
			}

			let selectedNoteId = null;
			if (foundIds.length) {
				selectedNoteId = foundIds[0];
			} else {
				selectedNoteId = notes.length ? notes[0].id : null;
			}

			this.store().dispatch({
				type: 'NOTE_SELECT',
				id: selectedNoteId,
			});
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private resourceFetcher_downloadComplete(event: any) {
		if (event.encrypted) {
			void DecryptionWorker.instance().scheduleStart();
		}
	}

	private async decryptionWorker_resourceMetadataButNotBlobDecrypted() {
		ResourceFetcher.instance().scheduleAutoAddResources();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public reducerActionToString(action: any) {
		const o = [action.type];
		if ('id' in action) o.push(action.id);
		if ('noteId' in action) o.push(action.noteId);
		if ('folderId' in action) o.push(action.folderId);
		if ('tagId' in action) o.push(action.tagId);
		if ('tag' in action) o.push(action.tag.id);
		if ('folder' in action) o.push(action.folder.id);
		if ('notesSource' in action) o.push(JSON.stringify(action.notesSource));
		return o.join(', ');
	}

	public hasGui() {
		return false;
	}

	public uiType() {
		return this.hasGui() ? 'gui' : 'cli';
	}

	public generalMiddlewareFn() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const middleware = (store: any) => (next: any) => (action: any) => {
			return this.generalMiddleware(store, next, action);
		};

		return middleware;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected async applySettingsSideEffects(action: any = null) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const sideEffects: any = {
			'dateFormat': async () => {
				time.setLocale(Setting.value('locale'));
				time.setDateFormat(Setting.value('dateFormat'));
				time.setTimeFormat(Setting.value('timeFormat'));
			},
			'net.ignoreTlsErrors': async () => {
				process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = Setting.value('net.ignoreTlsErrors') ? '0' : '1';
			},
			'net.customCertificates': async () => {
				const caPaths = Setting.value('net.customCertificates').split(',');
				for (let i = 0; i < caPaths.length; i++) {
					const f = caPaths[i].trim();
					if (!f) continue;
					syswidecas.addCAs(f);
				}
			},
			'net.proxyEnabled': async () => {
				setupProxySettings({
					maxConcurrentConnections: Setting.value('sync.maxConcurrentConnections'),
					proxyTimeout: Setting.value('net.proxyTimeout'),
					proxyEnabled: Setting.value('net.proxyEnabled'),
					proxyUrl: Setting.value('net.proxyUrl'),
				});
			},

			// Note: this used to run when "encryption.enabled" was changed, but
			// now we run it anytime any property of the sync target info is
			// changed. This is not optimal but:
			// - The sync target info rarely changes.
			// - All the calls below are cheap or do nothing if there's nothing
			//   to do.
			'syncInfoCache': async () => {
				if (this.hasGui()) {
					appLogger.info('"syncInfoCache" was changed - setting up encryption related code');

					await loadMasterKeysFromSettings(EncryptionService.instance());
					void DecryptionWorker.instance().scheduleStart();
					const loadedMasterKeyIds = EncryptionService.instance().loadedMasterKeyIds();

					this.dispatch({
						type: 'MASTERKEY_REMOVE_NOT_LOADED',
						ids: loadedMasterKeyIds,
					});

					// Schedule a sync operation so that items that need to be encrypted
					// are sent to sync target.
					void reg.scheduleSync();
				}
			},

			'sync.interval': async () => {
				if (this.hasGui()) reg.setupRecurrentSync();
			},
		};

		sideEffects['timeFormat'] = sideEffects['dateFormat'];
		sideEffects['locale'] = sideEffects['dateFormat'];
		sideEffects['encryption.passwordCache'] = sideEffects['syncInfoCache'];
		sideEffects['encryption.masterPassword'] = sideEffects['syncInfoCache'];
		sideEffects['sync.maxConcurrentConnections'] = sideEffects['net.proxyEnabled'];
		sideEffects['sync.proxyTimeout'] = sideEffects['net.proxyEnabled'];
		sideEffects['sync.proxyUrl'] = sideEffects['net.proxyEnabled'];

		if (action) {
			const effect = sideEffects[action.key];
			if (effect) await effect();
		} else {
			for (const key in sideEffects) {
				await sideEffects[key]();
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	protected async generalMiddleware(store: any, next: any, action: any) {
		// appLogger.debug('Reducer action', this.reducerActionToString(action));

		const result = next(action);
		let refreshNotes = false;
		let doRefreshFolders: boolean | string = false;
		let refreshNotesUseSelectedNoteId = false;
		let refreshNotesHash = '';

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		await reduxSharedMiddleware(store, next, action, ((action: any) => { this.dispatch(action); }) as any);
		const newState = store.getState() as State;

		if (this.hasGui() && ['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
			if (!(await reg.syncTarget().syncStarted())) void reg.scheduleSync(15 * 1000, { syncSteps: ['update_remote', 'delete_remote'] });
			SearchEngine.instance().scheduleSyncTables();
		}

		// Don't add FOLDER_UPDATE_ALL as refreshFolders() is calling it too, which
		// would cause the sidebar to refresh all the time.
		if (this.hasGui() && ['FOLDER_UPDATE_ONE'].indexOf(action.type) >= 0) {
			doRefreshFolders = true;
		}

		// If a note gets deleted to the trash or gets restored we refresh the folders so that the
		// note count can be updated.
		if (this.hasGui() && ['NOTE_UPDATE_ONE'].includes(action.type)) {
			if (action.changedFields && action.changedFields.includes('deleted_time')) {
				doRefreshFolders = true;
			}
		}

		if (action.type === 'HISTORY_BACKWARD' || action.type === 'HISTORY_FORWARD') {
			refreshNotes = true;
			refreshNotesUseSelectedNoteId = true;
		}

		if (action.type === 'HISTORY_BACKWARD' || action.type === 'HISTORY_FORWARD' || action.type === 'FOLDER_SELECT' || action.type === 'FOLDER_DELETE' || action.type === 'FOLDER_AND_NOTE_SELECT' || (action.type === 'SEARCH_UPDATE' && newState.notesParentType === 'Folder')) {
			Setting.setValue('activeFolderId', newState.selectedFolderId);
			this.currentFolder_ = newState.selectedFolderId ? await Folder.load(newState.selectedFolderId) : null;
			refreshNotes = true;

			if (action.type === 'FOLDER_AND_NOTE_SELECT') {
				refreshNotesUseSelectedNoteId = true;
				refreshNotesHash = action.hash;
			}
		}

		if (['HISTORY_BACKWARD', 'HISTORY_FORWARD', 'FOLDER_SELECT', 'TAG_SELECT', 'SMART_FILTER_SELECT', 'FOLDER_DELETE', 'FOLDER_AND_NOTE_SELECT'].includes(action.type) || (action.type === 'SEARCH_UPDATE' && newState.notesParentType === 'Folder')) {
			Setting.setValue('notesParent', serializeNotesParent(getNotesParent(newState)));
		}

		if (this.hasGui() && (action.type === 'NOTE_IS_INSERTING_NOTES' && !action.value)) {
			refreshNotes = true;
		}

		if (this.hasGui() && ((action.type === 'SETTING_UPDATE_ONE' && action.key === 'uncompletedTodosOnTop') || action.type === 'SETTING_UPDATE_ALL')) {
			refreshNotes = true;
		}

		if (this.hasGui() && ((action.type === 'SETTING_UPDATE_ONE' && action.key === 'showCompletedTodos') || action.type === 'SETTING_UPDATE_ALL')) {
			refreshNotes = true;
		}

		if (this.hasGui() && ((action.type === 'SETTING_UPDATE_ONE' && action.key.indexOf('notes.sortOrder') === 0) || action.type === 'SETTING_UPDATE_ALL')) {
			refreshNotes = true;
		}

		if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'locale') {
			refreshNotes = true;
			doRefreshFolders = 'now';
		}

		if (action.type === 'SMART_FILTER_SELECT') {
			refreshNotes = true;
			refreshNotesUseSelectedNoteId = true;
		}

		// Should refresh the notes when:
		// - A tag is selected, to show the notes for that tag
		// - When a tag is updated so that when searching by tags, the search results are updated
		// https://github.com/laurent22/joplin/issues/3754
		if (['TAG_SELECT', 'TAG_DELETE', 'TAG_UPDATE_ONE', 'NOTE_TAG_REMOVE'].includes(action.type)) {
			refreshNotes = true;
		}

		if (action.type === 'SEARCH_SELECT' || action.type === 'SEARCH_DELETE') {
			refreshNotes = true;
		}

		if (action.type === 'NOTE_TAG_REMOVE') {
			if (newState.notesParentType === 'Tag' && newState.selectedTagId === action.item.id) {
				if (newState.notes.length === newState.selectedNoteIds.length) {
					await this.refreshCurrentFolder();
					refreshNotesUseSelectedNoteId = true;
				}
				refreshNotes = true;
			}
		}

		if (refreshNotes) {
			await this.refreshNotes(newState, refreshNotesUseSelectedNoteId, refreshNotesHash);
		}

		if (action.type === 'NOTE_UPDATE_ONE') {
			if (!action.changedFields.length ||
				action.changedFields.includes('parent_id') ||
				action.changedFields.includes('encryption_applied') ||
				action.changedFields.includes('is_conflict')
			) {
				doRefreshFolders = true;
			}
		}

		if (action.type === 'NOTE_DELETE') {
			doRefreshFolders = true;
		}

		if (this.hasGui() && action.type === 'SETTING_UPDATE_ALL') {
			doRefreshFolders = 'now';
		}

		if (this.hasGui() && action.type === 'SETTING_UPDATE_ONE' && (
			action.key.indexOf('folders.sortOrder') === 0 ||
			action.key === 'showNoteCounts' ||
			action.key === 'showCompletedTodos')) {
			doRefreshFolders = 'now';
		}

		if (this.hasGui() && action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
			void DecryptionWorker.instance().scheduleStart();
		}

		if (this.hasGui() && action.type === 'SYNC_CREATED_OR_UPDATED_RESOURCE') {
			void ResourceFetcher.instance().autoAddResources();
		}

		if (action.type === 'SETTING_UPDATE_ONE') {
			await this.applySettingsSideEffects(action);
		} else if (action.type === 'SETTING_UPDATE_ALL') {
			await this.applySettingsSideEffects();
		}

		if (doRefreshFolders) {
			if (doRefreshFolders === 'now') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				await refreshFolders((action: any) => this.dispatch(action), newState.selectedFolderId);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				await scheduleRefreshFolders((action: any) => this.dispatch(action), newState.selectedFolderId);
			}
		}
		return result;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public dispatch(action: any) {
		if (this.store()) return this.store().dispatch(action);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public reducer(state: any = defaultState, action: any) {
		return reducer(state, action);
	}

	public initRedux() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.store_ = createStore(this.reducer, applyMiddleware(this.generalMiddlewareFn() as any));
		setStore(this.store_);

		this.store_.dispatch({
			type: 'PROFILE_CONFIG_SET',
			value: this.profileConfig_,
		});

		BaseModel.dispatch = this.store().dispatch;
		BaseSyncTarget.dispatch = this.store().dispatch;
		DecryptionWorker.instance().dispatch = this.store().dispatch;
		ResourceFetcher.instance().dispatch = this.store().dispatch;
		ShareService.instance().initialize(this.store(), EncryptionService.instance());
	}

	public deinitRedux() {
		this.store_ = null;
		BaseModel.dispatch = function() {};
		BaseSyncTarget.dispatch = function() {};
		DecryptionWorker.instance().dispatch = function() {};
		ResourceFetcher.instance().dispatch = function() {};
	}

	public async readFlagsFromFile(flagPath: string) {
		if (!fs.existsSync(flagPath)) return {};
		let flagContent = fs.readFileSync(flagPath, 'utf8');
		if (!flagContent) return {};

		flagContent = flagContent.trim();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let flags: any = splitCommandString(flagContent);
		flags.splice(0, 0, 'cmd');
		flags.splice(0, 0, 'node');

		flags = await this.handleStartFlags_(flags, false);

		return flags.matched;
	}

	protected startRotatingLogMaintenance(profileDir: string) {
		this.rotatingLogs = new RotatingLogs(profileDir);
		const processLogs = async () => {
			try {
				await this.rotatingLogs.cleanActiveLogFile();
				await this.rotatingLogs.deleteNonActiveLogFiles();
			} catch (error) {
				appLogger.error(error);
			}
		};
		shim.setTimeout(() => { void processLogs(); }, 60000);
		shim.setInterval(() => { void processLogs(); }, 24 * 60 * 60 * 1000);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async start(argv: string[], options: StartOptions = null): Promise<any> {
		options = {
			keychainEnabled: true,
			setupGlobalLogger: true,
			...options,
		};

		const startFlags = await this.handleStartFlags_(argv);

		argv = startFlags.argv;
		let initArgs = startFlags.matched;
		if (argv.length) this.showPromptString_ = false;

		let appName = options.appName;
		if (!appName) {
			appName = initArgs.env === 'dev' ? 'joplindev' : 'joplin';
			if (Setting.value('appId').indexOf('-desktop') >= 0) appName += '-desktop';
		}
		Setting.setConstant('appName', appName);

		// https://immerjs.github.io/immer/docs/freezing
		setAutoFreeze(initArgs.env === 'dev');

		const { rootProfileDir, homeDir } = determineProfileAndBaseDir(options.rootProfileDir ?? initArgs.profileDir, appName);
		const { profileDir, profileConfig, isSubProfile } = await initProfile(rootProfileDir);
		this.profileConfig_ = profileConfig;

		const resourceDirName = 'resources';
		const resourceDir = `${profileDir}/${resourceDirName}`;
		const tempDir = `${profileDir}/tmp`;
		const cacheDir = `${profileDir}/cache`;

		Setting.setConstant('env', initArgs.env);
		Setting.setConstant('resourceDirName', resourceDirName);
		Setting.setConstant('resourceDir', resourceDir);
		Setting.setConstant('tempDir', tempDir);
		Setting.setConstant('pluginDataDir', `${profileDir}/plugin-data`);
		Setting.setConstant('cacheDir', cacheDir);
		Setting.setConstant('pluginDir', `${rootProfileDir}/plugins`);
		Setting.setConstant('homeDir', homeDir);

		SyncTargetRegistry.addClass(SyncTargetNone);
		SyncTargetRegistry.addClass(SyncTargetFilesystem);
		SyncTargetRegistry.addClass(SyncTargetOneDrive);
		SyncTargetRegistry.addClass(SyncTargetNextcloud);
		SyncTargetRegistry.addClass(SyncTargetWebDAV);
		SyncTargetRegistry.addClass(SyncTargetDropbox);
		SyncTargetRegistry.addClass(SyncTargetAmazonS3);
		SyncTargetRegistry.addClass(SyncTargetJoplinServer);
		SyncTargetRegistry.addClass(SyncTargetJoplinCloud);

		try {
			await shim.fsDriver().remove(tempDir);
		} catch (error) {
			// Can't do anything in this case, not even log, since the logger
			// is not yet ready. But normally it's not an issue if the temp
			// dir cannot be deleted.
		}

		await fs.mkdirp(profileDir, 0o755);
		await fs.mkdirp(resourceDir, 0o755);
		await fs.mkdirp(tempDir, 0o755);
		await fs.mkdirp(cacheDir, 0o755);

		// Clean up any remaining watched files (they start with "edit-")
		await shim.fsDriver().removeAllThatStartWith(profileDir, 'edit-');

		const extraFlags = await this.readFlagsFromFile(`${profileDir}/flags.txt`);
		initArgs = { ...initArgs, ...extraFlags };

		const globalLogger = Logger.globalLogger;

		if (options.setupGlobalLogger) {
			globalLogger.addTarget(TargetType.File, { path: `${profileDir}/log.txt` });
			if (Setting.value('appType') === 'desktop') {
				globalLogger.addTarget(TargetType.Console);
			}
			globalLogger.setLevel(initArgs.logLevel);
		}

		reg.setLogger(Logger.create('') as Logger);
		// reg.dispatch = () => {};

		BaseService.logger_ = globalLogger;


		appLogger.info(`Profile directory: ${profileDir}`);
		appLogger.info(`Root profile directory: ${rootProfileDir}`);

		this.database_ = new JoplinDatabase(new DatabaseDriverNode());
		this.database_.setLogExcludedQueryTypes(['SELECT']);
		this.database_.setLogger(globalLogger);

		await this.database_.open({ name: `${profileDir}/database.sqlite` });

		// if (Setting.value('env') === 'dev') await this.database_.clearForTesting();

		reg.setDb(this.database_);
		BaseModel.setDb(this.database_);

		setRSA(RSA);

		await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);
		await migrateMasterPassword();
		await handleSyncStartupOperation();

		appLogger.info(`Client ID: ${Setting.value('clientId')}`);

		BaseItem.syncShareCache = parseShareCache(Setting.value('sync.shareCache'));

		if (initArgs?.isSafeMode) {
			Setting.setValue('isSafeMode', true);
		}

		const safeModeFlagFile = join(profileDir, safeModeFlagFilename);
		if (await fs.pathExists(safeModeFlagFile) && fs.readFileSync(safeModeFlagFile, 'utf8') === 'true') {
			appLogger.info(`Safe mode enabled because of file: ${safeModeFlagFile}`);
			Setting.setValue('isSafeMode', true);
			fs.removeSync(safeModeFlagFile);
		}

		if (Setting.value('firstStart')) {

			// detectAndSetLocale sets the locale to the system default locale.
			// Not calling it when a new profile is created ensures that the
			// the language set by the user is not overridden by the system
			// default language.
			if (!Setting.value('isSubProfile')) {
				const locale = shim.detectAndSetLocale(Setting);
				reg.logger().info(`First start: detected locale as ${locale}`);
			}
			Setting.skipDefaultMigrations();

			if (Setting.value('env') === 'dev') {
				Setting.setValue('showTrayIcon', 0);
				Setting.setValue('autoUpdateEnabled', 0);
				Setting.setValue('sync.interval', 3600);
			}

			Setting.setValue('firstStart', 0);
		} else {
			Setting.applyDefaultMigrations();
			Setting.applyUserSettingMigration();
		}

		setLocale(Setting.value('locale'));

		if (Setting.value('env') === Env.Dev) {
			// Setting.setValue('sync.10.path', 'https://api.joplincloud.com');
			// Setting.setValue('sync.10.userContentPath', 'https://joplinusercontent.com');
			Setting.setValue('sync.10.path', 'http://api.joplincloud.local:22300');
			Setting.setValue('sync.10.userContentPath', 'http://joplinusercontent.local:22300');
			Setting.setValue('sync.10.website', 'http://joplincloud.local:22300');
		}

		// For now always disable fuzzy search due to performance issues:
		// https://discourse.joplinapp.org/t/1-1-4-keyboard-locks-up-while-typing/11231/11
		// https://discourse.joplinapp.org/t/serious-lagging-when-there-are-tens-of-thousands-of-notes/11215/23
		Setting.setValue('db.fuzzySearchEnabled', 0);

		if (Setting.value('encryption.shouldReencrypt') < 0) {
			// We suggest re-encryption if the user has at least one notebook
			// and if encryption is enabled. This code runs only when shouldReencrypt = -1
			// which can be set by a maintenance script for example.
			const folderCount = await Folder.count();
			const itShould = getEncryptionEnabled() && !!folderCount ? Setting.SHOULD_REENCRYPT_YES : Setting.SHOULD_REENCRYPT_NO;
			Setting.setValue('encryption.shouldReencrypt', itShould);
		}

		if ('welcomeDisabled' in initArgs) Setting.setValue('welcome.enabled', !initArgs.welcomeDisabled);
		if (isSubProfile) Setting.setValue('welcome.enabled', false);

		if (!Setting.value('api.token')) {
			void EncryptionService.instance()
				.generateApiToken()
			// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
				.then((token: string) => {
					Setting.setValue('api.token', token);
				});
		}

		time.setDateFormat(Setting.value('dateFormat'));
		time.setTimeFormat(Setting.value('timeFormat'));

		BaseItem.revisionService_ = RevisionService.instance();

		KvStore.instance().setDb(reg.db());

		BaseItem.encryptionService_ = EncryptionService.instance();
		BaseItem.shareService_ = ShareService.instance();
		Resource.shareService_ = ShareService.instance();
		DecryptionWorker.instance().setLogger(globalLogger);
		DecryptionWorker.instance().setEncryptionService(EncryptionService.instance());
		DecryptionWorker.instance().setKvStore(KvStore.instance());
		await loadMasterKeysFromSettings(EncryptionService.instance());
		DecryptionWorker.instance().on('resourceMetadataButNotBlobDecrypted', this.decryptionWorker_resourceMetadataButNotBlobDecrypted);

		ResourceFetcher.instance().setFileApi(() => {
			return reg.syncTarget().fileApi();
		});
		ResourceFetcher.instance().setLogger(globalLogger);
		ResourceFetcher.instance().on('downloadComplete', this.resourceFetcher_downloadComplete);
		void ResourceFetcher.instance().start();

		SearchEngine.instance().setDb(reg.db());
		SearchEngine.instance().setLogger(reg.logger());
		SearchEngine.instance().scheduleSyncTables();

		const currentFolderId = Setting.value('activeFolderId');
		let currentFolder = null;
		if (currentFolderId) currentFolder = await Folder.load(currentFolderId);
		if (!currentFolder) currentFolder = await Folder.defaultFolder();
		Setting.setValue('activeFolderId', currentFolder ? currentFolder.id : '');

		await setupAutoDeletion();

		await MigrationService.instance().run();

		return argv;
	}
}
