const { createStore, applyMiddleware } = require('redux');
const { reducer, defaultState } = require('lib/reducer.js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { Database } = require('lib/database.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { BaseModel } = require('lib/base-model.js');
const { Folder } = require('lib/models/folder.js');
const { BaseItem } = require('lib/models/base-item.js');
const { Note } = require('lib/models/note.js');
const { Tag } = require('lib/models/tag.js');
const { Setting } = require('lib/models/setting.js');
const { Logger } = require('lib/logger.js');
const { sprintf } = require('sprintf-js');
const { reg } = require('lib/registry.js');
const { fileExtension } = require('lib/path-utils.js');
const { shim } = require('lib/shim.js');
const { _, setLocale, defaultLocale, closestSupportedLocale } = require('lib/locale.js');
const os = require('os');
const fs = require('fs-extra');
const EventEmitter = require('events');

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
		this.dispatch({
			type: 'FOLDERS_SELECT',
			id: folder ? folder.id : '',
		});
	}

	// Handles the initial flags passed to main script and
	// returns the remaining args.
	async handleStartFlags_(argv) {
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

		if (!matched.logLevel) matched.logLevel = Logger.LEVEL_INFO;
		if (!matched.env) matched.env = 'prod';

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

	async refreshNotes(parentType, parentId) {
		this.logger().debug('Refreshing notes:', parentType, parentId);

		const state = this.store().getState();

		let options = {
			order: state.notesOrder,
			uncompletedTodosOnTop: Setting.value('uncompletedTodosOnTop'),
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
			type: 'NOTES_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});

		this.store().dispatch({
			type: 'NOTES_SELECT',
			noteId: notes.length ? notes[0].id : null,
		});
	}

	reducerActionToString(action) {
		let o = [action.type];
		if (action.id) o.push(action.id);
		if (action.noteId) o.push(action.noteId);
		if (action.folderId) o.push(action.folderId);
		if (action.tagId) o.push(action.tagId);
		if (action.tag) o.push(action.tag.id);
		if (action.folder) o.push(action.folder.id);
		if (action.notesSource) o.push(JSON.stringify(action.notesSource));
		return o.join(', ');
	}

	generalMiddleware() {
		const middleware = store => next => async (action) => {
			this.logger().debug('Reducer action', this.reducerActionToString(action));

			const result = next(action);
			const newState = store.getState();

			if (action.type == 'FOLDERS_SELECT' || action.type === 'FOLDER_DELETE') {
				Setting.setValue('activeFolderId', newState.selectedFolderId);
				this.currentFolder_ = newState.selectedFolderId ? await Folder.load(newState.selectedFolderId) : null;
				await this.refreshNotes(Folder.modelType(), newState.selectedFolderId);
			}

			if (action.type == 'TAGS_SELECT') {
				await this.refreshNotes(Tag.modelType(), action.id);
			}

			if (action.type == 'SEARCH_SELECT') {
				await this.refreshNotes(BaseModel.TYPE_SEARCH, action.id);
			}

			if (this.gui() && action.type == 'SETTINGS_UPDATE_ONE' && action.key == 'sync.interval' || action.type == 'SETTINGS_UPDATE_ALL') {
				reg.setupRecurrentSync();
			}

		  	return result;
		}

		return middleware;
	}

	dispatch(action) {
		if (this.store()) return this.store().dispatch(action);
	}

	initRedux() {
		this.store_ = createStore(reducer, applyMiddleware(this.generalMiddleware()));
		BaseModel.dispatch = this.store().dispatch;
		FoldersScreenUtils.dispatch = this.store().dispatch;
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

		// const packageJson = require('./package.json');
		// this.logger_.info(sprintf('Starting %s %s (%s)...', packageJson.name, packageJson.version, Setting.value('env')));
		this.logger_.info('Profile directory: ' + profileDir);

		this.database_ = new JoplinDatabase(new DatabaseDriverNode());
		//this.database_.setLogExcludedQueryTypes(['SELECT']);
		this.database_.setLogger(this.dbLogger_);
		await this.database_.open({ name: profileDir + '/database.sqlite' });

		reg.setDb(this.database_);
		BaseModel.db_ = this.database_;

		await Setting.load();

		if (Setting.value('firstStart')) {
			const locale = shim.detectAndSetLocale(Setting);
			reg.logger().info('First start: detected locale as ' + locale);
			Setting.setValue('firstStart', 0)
		} else {
			setLocale(Setting.value('locale'));
		}

		let currentFolderId = Setting.value('activeFolderId');
		let currentFolder = null;
		if (currentFolderId) currentFolder = await Folder.load(currentFolderId);
		if (!currentFolder) currentFolder = await Folder.defaultFolder();
		Setting.setValue('activeFolderId', currentFolder ? currentFolder.id : '');

		return argv;
	}

}

module.exports = { BaseApplication };