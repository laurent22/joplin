const { createStore, applyMiddleware } = require('redux');
const { reducer, defaultState, stateUtils } = require('lib/reducer.js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { Database } = require('lib/database.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const BaseItem = require('lib/models/BaseItem.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const Setting = require('lib/models/Setting.js');
const { Logger } = require('lib/logger.js');
const { splitCommandString } = require('lib/string-utils.js');
const { sprintf } = require('sprintf-js');
const { reg } = require('lib/registry.js');
const { time } = require('lib/time-utils.js');
const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { fileExtension } = require('lib/path-utils.js');
const { shim } = require('lib/shim.js');
const { _, setLocale, defaultLocale, closestSupportedLocale } = require('lib/locale.js');
const os = require('os');
const fs = require('fs-extra');
const EventEmitter = require('events');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTargetFilesystem = require('lib/SyncTargetFilesystem.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const SyncTargetOneDriveDev = require('lib/SyncTargetOneDriveDev.js');
const SyncTargetNextcloud = require('lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('lib/SyncTargetWebDAV.js');
const EncryptionService = require('lib/services/EncryptionService');
const DecryptionWorker = require('lib/services/DecryptionWorker');

SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetOneDriveDev);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);

class BaseApplication {

	constructor() {
		this.logger_ = new Logger();
		this.dbLogger_ = new Logger();
		this.eventEmitter_ = new EventEmitter();

		// Note: this is basically a cache of state.selectedFolderId. It should *only* 
		// be derived from the state and not set directly since that would make the
		// state and UI out of sync.
		this.currentFolder_ = null; 
	}

	logger() {
		return this.logger_;
	}

	store() {
		return this.store_;
	}

	currentFolder() {
		return this.currentFolder_;
	}

	async refreshCurrentFolder() {
		let newFolder = null;
		
		if (this.currentFolder_) newFolder = await Folder.load(this.currentFolder_.id);
		if (!newFolder) newFolder = await Folder.defaultFolder();

		this.switchCurrentFolder(newFolder);
	}

	switchCurrentFolder(folder) {
		if (!this.hasGui()) {
			this.currentFolder_ = Object.assign({}, folder);
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
	async handleStartFlags_(argv, setDefaults = true) {
		let matched = {};
		argv = argv.slice(0);
		argv.splice(0, 2); // First arguments are the node executable, and the node JS file

		while (argv.length) {
			let arg = argv[0];
			let nextArg = argv.length >= 2 ? argv[1] : null;
			
			if (arg == '--profile') {
				if (!nextArg) throw new Error(_('Usage: %s', '--profile <dir-path>'));
				matched.profileDir = nextArg;
				argv.splice(0, 2);
				continue;
			}

			if (arg == '--env') {
				if (!nextArg) throw new Error(_('Usage: %s', '--env <dev|prod>'));
				matched.env = nextArg;
				argv.splice(0, 2);
				continue;
			}

			if (arg == '--is-demo') {
				Setting.setConstant('isDemo', true);
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--open-dev-tools') {
				Setting.setConstant('openDevTools', true);
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--update-geolocation-disabled') {
				Note.updateGeolocationEnabled_ = false;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--stack-trace-enabled') {
				this.showStackTraces_ = true;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--log-level') {
				if (!nextArg) throw new Error(_('Usage: %s', '--log-level <none|error|warn|info|debug>'));
				matched.logLevel = Logger.levelStringToId(nextArg);
				argv.splice(0, 2);
				continue;
			}

			if (arg.length && arg[0] == '-') {
				throw new Error(_('Unknown flag: %s', arg));
			} else {
				break;
			}
		}

		if (setDefaults) {
			if (!matched.logLevel) matched.logLevel = Logger.LEVEL_INFO;
			if (!matched.env) matched.env = 'prod';
		}

		return {
			matched: matched,
			argv: argv,
		};
	}

	on(eventName, callback) {
		return this.eventEmitter_.on(eventName, callback);
	}

	async exit(code = 0) {
		await Setting.saveAll();
		process.exit(code);
	}

	async refreshNotes(state) {
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
		}

		this.logger().debug('Refreshing notes:', parentType, parentId);

		let options = {
			order: stateUtils.notesOrder(state.settings),
			uncompletedTodosOnTop: Setting.value('uncompletedTodosOnTop'),
			caseInsensitive: true,
		};

		const source = JSON.stringify({
			options: options,
			parentId: parentId,
		});

		let notes = [];

		if (parentId) {
			if (parentType === Folder.modelType()) {
				notes = await Note.previews(parentId, options);
			} else if (parentType === Tag.modelType()) {
				notes = await Tag.notes(parentId);
			} else if (parentType === BaseModel.TYPE_SEARCH) {
				let fields = Note.previewFields();
				let search = BaseModel.byId(state.searches, parentId);
				notes = await Note.previews(null, {
					fields: fields,
					anywherePattern: '*' + search.query_pattern + '*',
				});
			}
		}

		this.store().dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});

		this.store().dispatch({
			type: 'NOTE_SELECT',
			id: notes.length ? notes[0].id : null,
		});
	}

	reducerActionToString(action) {
		let o = [action.type];
		if ('id' in action) o.push(action.id);
		if ('noteId' in action) o.push(action.noteId);
		if ('folderId' in action) o.push(action.folderId);
		if ('tagId' in action) o.push(action.tagId);
		if ('tag' in action) o.push(action.tag.id);
		if ('folder' in action) o.push(action.folder.id);
		if ('notesSource' in action) o.push(JSON.stringify(action.notesSource));
		return o.join(', ');
	}

	hasGui() {
		return false;
	}

	uiType() {
		return this.hasGui() ? 'gui' : 'cli';
	}

	generalMiddlewareFn() {
		const middleware = store => next => (action) => {
			return this.generalMiddleware(store, next, action);
		}

		return middleware;
	}

	async generalMiddleware(store, next, action) {
		this.logger().debug('Reducer action', this.reducerActionToString(action));

		const result = next(action);
		const newState = store.getState();
		let refreshNotes = false;

		if (action.type == 'FOLDER_SELECT' || action.type === 'FOLDER_DELETE') {
			Setting.setValue('activeFolderId', newState.selectedFolderId);
			this.currentFolder_ = newState.selectedFolderId ? await Folder.load(newState.selectedFolderId) : null;
			refreshNotes = true;
		}

		if (this.hasGui() && ((action.type == 'SETTING_UPDATE_ONE' && action.key == 'uncompletedTodosOnTop') || action.type == 'SETTING_UPDATE_ALL')) {
			refreshNotes = true;
		}

		if (this.hasGui() && ((action.type == 'SETTING_UPDATE_ONE' && action.key.indexOf('notes.sortOrder') === 0) || action.type == 'SETTING_UPDATE_ALL')) {
			refreshNotes = true;
		}

		if (action.type == 'TAG_SELECT' || action.type === 'TAG_DELETE') {
			refreshNotes = true;
		}

		if (action.type == 'SEARCH_SELECT' || action.type === 'SEARCH_DELETE') {
			refreshNotes = true;
		}

		if (refreshNotes) {
			await this.refreshNotes(newState);
		}

		if ((action.type == 'SETTING_UPDATE_ONE' && (action.key == 'dateFormat' || action.key == 'timeFormat')) || (action.type == 'SETTING_UPDATE_ALL')) {
			time.setDateFormat(Setting.value('dateFormat'));
			time.setTimeFormat(Setting.value('timeFormat'));
		}

		if ((action.type == 'SETTING_UPDATE_ONE' && (action.key.indexOf('encryption.') === 0)) || (action.type == 'SETTING_UPDATE_ALL')) {
			if (this.hasGui()) {
				await EncryptionService.instance().loadMasterKeysFromSettings();
				DecryptionWorker.instance().scheduleStart();
				const loadedMasterKeyIds = EncryptionService.instance().loadedMasterKeyIds();

				this.dispatch({
					type: 'MASTERKEY_REMOVE_NOT_LOADED',
					ids: loadedMasterKeyIds,
				});

				// Schedule a sync operation so that items that need to be encrypted
				// are sent to sync target.
				reg.scheduleSync();
			}
		}

		if (action.type === 'NOTE_UPDATE_ONE') {
			// If there is a conflict, we refresh the folders so as to display "Conflicts" folder
			if (action.note && action.note.is_conflict) {
				await FoldersScreenUtils.refreshFolders();
			}
		}

		if (this.hasGui() && action.type == 'SETTING_UPDATE_ONE' && action.key == 'sync.interval' || action.type == 'SETTING_UPDATE_ALL') {
			reg.setupRecurrentSync();
		}

		if (this.hasGui() && action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
			DecryptionWorker.instance().scheduleStart();
		}

	  	return result;
	}

	dispatch(action) {
		if (this.store()) return this.store().dispatch(action);
	}

	reducer(state = defaultState, action) {
		return reducer(state, action);
	}

	initRedux() {
		this.store_ = createStore(this.reducer, applyMiddleware(this.generalMiddlewareFn()));
		BaseModel.dispatch = this.store().dispatch;
		FoldersScreenUtils.dispatch = this.store().dispatch;
		reg.dispatch = this.store().dispatch;
		BaseSyncTarget.dispatch = this.store().dispatch;
		DecryptionWorker.instance().dispatch = this.store().dispatch;
	}

	async readFlagsFromFile(flagPath) {
		if (!fs.existsSync(flagPath)) return {};
		let flagContent = fs.readFileSync(flagPath, 'utf8');
		if (!flagContent) return {};

		flagContent = flagContent.trim();

		let flags = splitCommandString(flagContent);
		flags.splice(0, 0, 'cmd');
		flags.splice(0, 0, 'node');

		flags = await this.handleStartFlags_(flags, false);
		
		return flags.matched;
	}

	async start(argv) {
		let startFlags = await this.handleStartFlags_(argv);

		argv = startFlags.argv;
		let initArgs = startFlags.matched;
		if (argv.length) this.showPromptString_ = false;

		if (process.argv[1].indexOf('joplindev') >= 0) {
			if (!initArgs.profileDir) initArgs.profileDir = '/mnt/d/Temp/TestNotes2';
			initArgs.logLevel = Logger.LEVEL_DEBUG;
			initArgs.env = 'dev';
		}

		let appName = initArgs.env == 'dev' ? 'joplindev' : 'joplin';
		if (Setting.value('appId').indexOf('-desktop') >= 0) appName += '-desktop';
		Setting.setConstant('appName', appName);

		const profileDir = initArgs.profileDir ? initArgs.profileDir : os.homedir() + '/.config/' + Setting.value('appName');
		const resourceDir = profileDir + '/resources';
		const tempDir = profileDir + '/tmp';

		Setting.setConstant('env', initArgs.env);
		Setting.setConstant('profileDir', profileDir);
		Setting.setConstant('resourceDir', resourceDir);
		Setting.setConstant('tempDir', tempDir);

		await fs.mkdirp(profileDir, 0o755);
		await fs.mkdirp(resourceDir, 0o755);
		await fs.mkdirp(tempDir, 0o755);

		const extraFlags = await this.readFlagsFromFile(profileDir + '/flags.txt');
		initArgs = Object.assign(initArgs, extraFlags);

		this.logger_.addTarget('file', { path: profileDir + '/log.txt' });
		//this.logger_.addTarget('console');
		this.logger_.setLevel(initArgs.logLevel);

		reg.setLogger(this.logger_);
		reg.dispatch = (o) => {};

		this.dbLogger_.addTarget('file', { path: profileDir + '/log-database.txt' });
		this.dbLogger_.setLevel(initArgs.logLevel);

		if (Setting.value('env') === 'dev') {
			this.dbLogger_.setLevel(Logger.LEVEL_WARN);
		}

		this.logger_.info('Profile directory: ' + profileDir);

		this.database_ = new JoplinDatabase(new DatabaseDriverNode());
		this.database_.setLogExcludedQueryTypes(['SELECT']);
		this.database_.setLogger(this.dbLogger_);
		await this.database_.open({ name: profileDir + '/database.sqlite' });

		reg.setDb(this.database_);
		BaseModel.db_ = this.database_;

		await Setting.load();

		if (Setting.value('firstStart')) {
			const locale = shim.detectAndSetLocale(Setting);
			reg.logger().info('First start: detected locale as ' + locale);
			if (Setting.value('env') === 'dev') Setting.setValue('sync.target', SyncTargetRegistry.nameToId('onedrive_dev'));
			Setting.setValue('firstStart', 0)
		} else {
			setLocale(Setting.value('locale'));
		}

		EncryptionService.instance().setLogger(this.logger_);
		BaseItem.encryptionService_ = EncryptionService.instance();
		DecryptionWorker.instance().setLogger(this.logger_);
		DecryptionWorker.instance().setEncryptionService(EncryptionService.instance());
		await EncryptionService.instance().loadMasterKeysFromSettings();

		let currentFolderId = Setting.value('activeFolderId');
		let currentFolder = null;
		if (currentFolderId) currentFolder = await Folder.load(currentFolderId);
		if (!currentFolder) currentFolder = await Folder.defaultFolder();
		Setting.setValue('activeFolderId', currentFolder ? currentFolder.id : '');

		return argv;
	}

}

module.exports = { BaseApplication };