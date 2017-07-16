import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { FileApiDriverMemory } from 'lib/file-api-driver-memory.js';
import { FileApiDriverLocal } from 'lib/file-api-driver-local.js';
import { OneDriveApiNodeUtils } from './onedrive-api-node-utils.js';
import { JoplinDatabase } from 'lib/joplin-database.js';
import { Database } from 'lib/database.js';
import { DatabaseDriverNode } from 'lib/database-driver-node.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { Logger } from 'lib/logger.js';
import { sprintf } from 'sprintf-js';
import { vorpalUtils } from 'vorpal-utils.js';
import { reg } from 'lib/registry.js';
import { fileExtension } from 'lib/path-utils.js';
import { _ } from 'lib/locale.js';
import os from 'os';
import fs from 'fs-extra';

class Application {

	constructor() {
		this.showPromptString_ = true;
		this.logger_ = new Logger();
		this.dbLogger_ = new Logger();
		this.syncLogger_ = new Logger();
		this.synchronizers_ = {};
	}

	vorpal() {
		return this.vorpal_;
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

	updatePrompt() {
		if (!this.showPromptString_) return '';

		let path = '';
		if (this.currentFolder()) {
			path += '/' + this.currentFolder().title;
		}
		const prompt = Setting.value('appName') + ':' + path + '$ ';

		this.vorpal().delimiter(prompt);
	}

	switchCurrentFolder(folder) {
		this.currentFolder_ = folder;
		Setting.setValue('activeFolderId', folder ? folder.id : '');
		this.updatePrompt();
	}

	async loadItem(type, pattern, options = null) {
		let output = await this.loadItems(type, pattern, options);
		return output.length ? output[0] : null;
	}

	async loadItems(type, pattern, options = null) {
		if (type == BaseModel.TYPE_FOLDER && (pattern == Folder.conflictFolderTitle() || pattern == Folder.conflictFolderId())) return [Folder.conflictFolder()];

		if (!options) options = {};

		const parent = options.parent ? options.parent : app().currentFolder();
		const ItemClass = BaseItem.itemClass(type);

		if (type == BaseModel.TYPE_NOTE && pattern.indexOf('*') >= 0) { // Handle it as pattern
			if (!parent) throw new Error(_('No notebook selected.'));
			return await Note.previews(parent.id, { titlePattern: pattern });
		} else { // Single item
			let item = null;
			if (type == BaseModel.TYPE_NOTE) {
				if (!parent) throw new Error(_('No notebook has been specified.'));
				item = await ItemClass.loadFolderNoteByField(parent.id, 'title', pattern);
			} else {
				item = await ItemClass.loadByTitle(pattern);
			}
			if (item) return [item];

			item = await ItemClass.load(pattern); // Load by id
			if (item) return [item];

			if (pattern.length >= 4) {
				item = await ItemClass.loadByPartialId(pattern);
				if (item) return [item];
			}
		}

		return [];
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
				if (!nextArg) throw new Error(_('Usage: --profile <dir-path>'));
				matched.profileDir = nextArg;
				argv.splice(0, 2);
				continue;
			}

			if (arg == '--env') {
				if (!nextArg) throw new Error(_('Usage: --env <dev|prod>'));
				matched.env = nextArg;
				argv.splice(0, 2);
				continue;
			}

			if (arg == '--redraw-disabled') {
				vorpalUtils.setRedrawEnabled(false);
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--update-geolocation-disabled') {
				Note.updateGeolocationEnabled_ = false;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--stack-trace-enabled') {
				vorpalUtils.setStackTraceEnabled(true);
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--log-level') {
				if (!nextArg) throw new Error(_('Usage: --log-level <none|error|warn|info|debug>'));
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

	escapeShellArg(arg) {
		if (arg.indexOf('"') >= 0 && arg.indexOf("'") >= 0) throw new Error(_('Command line argument "%s" contains both quotes and double-quotes - aborting.', arg)); // Hopeless case
		let quote = '"';
		if (arg.indexOf('"') >= 0) quote = "'";
		if (arg.indexOf(' ') >= 0 || arg.indexOf("\t") >= 0) return quote + arg + quote;
		return arg;
	}

	shellArgsToString(args) {
		let output = [];
		for (let i = 0; i < args.length; i++) {
			output.push(this.escapeShellArg(args[i]));
		}
		return output.join(' ');
	}

	loadCommands_() {
		fs.readdirSync(__dirname).forEach((path) => {
			if (path.indexOf('command-') !== 0) return;
			const ext = fileExtension(path)
			if (ext != 'js') return;

			let CommandClass = require('./' + path);
			let cmd = new CommandClass();
			let vorpalCmd = this.vorpal().command(cmd.usage(), cmd.description());

			// TODO: maybe remove if the PR is not merged
			if ('disableTypeCasting' in vorpalCmd) vorpalCmd.disableTypeCasting();

			for (let i = 0; i < cmd.aliases().length; i++) {
				vorpalCmd.alias(cmd.aliases()[i]);
			}

			for (let i = 0; i < cmd.options().length; i++) {
				let options = cmd.options()[i];
				if (options.length == 2) vorpalCmd.option(options[0], options[1]);
				if (options.length == 3) vorpalCmd.option(options[0], options[1], options[2]);
				if (options.length > 3) throw new Error('Invalid number of option arguments');
			}

			if (cmd.autocomplete()) vorpalCmd.autocomplete(cmd.autocomplete());

			let actionFn = async function(args, end) {
				try {
					const fn = cmd.action.bind(this);
					await fn(args);
				} catch (error) {
					this.log(error);
				}
				vorpalUtils.redrawDone();
				end();
			};

			vorpalCmd.action(actionFn);

			let cancelFn = async function() {
				const fn = cmd.cancel.bind(this);
				await fn();
			};

			vorpalCmd.cancel(cancelFn);
		});
	}

	async synchronizer(syncTarget) {
		if (this.synchronizers_[syncTarget]) return this.synchronizers_[syncTarget];

		let fileApi = null;

		// TODO: create file api based on syncTarget

		if (syncTarget == 'onedrive') {
			const oneDriveApi = reg.oneDriveApi();
			let driver = new FileApiDriverOneDrive(oneDriveApi);
			let auth = Setting.value('sync.onedrive.auth');

			if (!oneDriveApi.auth()) {
				const oneDriveApiUtils = new OneDriveApiNodeUtils(oneDriveApi);
				auth = await oneDriveApiUtils.oauthDance(this.vorpal());
				Setting.setValue('sync.onedrive.auth', auth ? JSON.stringify(auth) : auth);
				if (!auth) return;
			}

			let appDir = await oneDriveApi.appDirectory();
			this.logger_.info('App dir: ' + appDir);
			fileApi = new FileApi(appDir, driver);
			fileApi.setLogger(this.logger_);
		} else if (syncTarget == 'memory') {
			fileApi = new FileApi('joplin', new FileApiDriverMemory());
			fileApi.setLogger(this.logger_);
		} else if (syncTarget == 'filesystem') {
			let syncDir = Setting.value('sync.filesystem.path');
			if (!syncDir) syncDir = Setting.value('profileDir') + '/sync';
			this.vorpal().log(_('Synchronizing with directory "%s"', syncDir));
			await fs.mkdirp(syncDir, 0o755);
			fileApi = new FileApi(syncDir, new FileApiDriverLocal());
			fileApi.setLogger(this.logger_);
		} else {
			throw new Error('Unknown backend: ' + syncTarget);
		}

		this.synchronizers_[syncTarget] = new Synchronizer(this.database_, fileApi, Setting.value('appType'));
		this.synchronizers_[syncTarget].setLogger(this.syncLogger_);

		return this.synchronizers_[syncTarget];
	}

	async start() {
		this.vorpal_ = require('vorpal')();
		vorpalUtils.initialize(this.vorpal());

		this.loadCommands_();

		let argv = process.argv;
		let startFlags = await this.handleStartFlags_(argv);
		argv = startFlags.argv;
		let initArgs = startFlags.matched;
		if (argv.length) this.showPromptString_ = false;

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
		this.logger_.setLevel(initArgs.logLevel);

		reg.setLogger(this.logger_);

		this.dbLogger_.addTarget('file', { path: profileDir + '/log-database.txt' });
		this.dbLogger_.setLevel(initArgs.logLevel);

		this.syncLogger_.addTarget('file', { path: profileDir + '/log-sync.txt' });
		this.syncLogger_.setLevel(initArgs.logLevel);

		const packageJson = require('./package.json');
		this.logger_.info(sprintf('Starting %s %s (%s)...', packageJson.name, packageJson.version, Setting.value('env')));
		this.logger_.info('Profile directory: ' + profileDir);

		this.database_ = new JoplinDatabase(new DatabaseDriverNode());
		this.database_.setLogger(this.dbLogger_);
		await this.database_.open({ name: profileDir + '/database.sqlite' });
		BaseModel.db_ = this.database_;
		await Setting.load();

		let currentFolderId = Setting.value('activeFolderId');
		this.currentFolder_ = null;
		if (currentFolderId) this.currentFolder_ = await Folder.load(currentFolderId);
		if (!this.currentFolder_) this.currentFolder_ = await Folder.defaultFolder();
		Setting.setValue('activeFolderId', this.currentFolder_ ? this.currentFolder_.id : '');

		if (this.currentFolder_) await this.vorpal().exec('use ' + this.currentFolder_.title);

		// If we still have arguments, pass it to Vorpal and exit
		if (argv.length) {
			let cmd = this.shellArgsToString(argv);
			await this.vorpal().exec(cmd);
		} else {
			this.updatePrompt();
			this.vorpal().show();
			this.vorpal().history(Setting.value('appId')); // Enables persistent history
			if (!this.currentFolder()) {
				this.vorpal().log(_('No notebook is defined. Create one with `mkbook <notebook>`.'));
			}
		}
	}

}

let application_ = null;

function app() {
	if (application_) return application_;
	application_ = new Application();
	return application_;
}

export { app };