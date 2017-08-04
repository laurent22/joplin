import { JoplinDatabase } from 'lib/joplin-database.js';
import { Database } from 'lib/database.js';
import { DatabaseDriverNode } from 'lib/database-driver-node.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { Logger } from 'lib/logger.js';
import { sprintf } from 'sprintf-js';
import { reg } from 'lib/registry.js';
import { fileExtension } from 'lib/path-utils.js';
import { _, setLocale, defaultLocale, closestSupportedLocale } from 'lib/locale.js';
import os from 'os';
import fs from 'fs-extra';
import yargParser from 'yargs-parser';
import { handleAutocompletion, installAutocompletionFile } from './autocompletion.js';
import { cliUtils } from './cli-utils.js';

class Application {

	constructor() {
		this.showPromptString_ = true;
		this.logger_ = new Logger();
		this.dbLogger_ = new Logger();
		this.autocompletion_ = { active: false };
		this.commands_ = {};
		this.commandMetadata_ = null;
		this.activeCommand_ = null;
		this.allCommandsLoaded_ = false;
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
		this.currentFolder_ = folder;
		Setting.setValue('activeFolderId', folder ? folder.id : '');
	}

	async guessTypeAndLoadItem(pattern, options = null) {
		let type = BaseModel.TYPE_NOTE;
		if (pattern.indexOf('/') === 0) {
			type = BaseModel.TYPE_FOLDER;
			pattern = pattern.substr(1);
		}
		return this.loadItem(type, pattern, options);
	}

	async loadItem(type, pattern, options = null) {
		let output = await this.loadItems(type, pattern, options);
		return output.length ? output[0] : null;
	}

	async loadItems(type, pattern, options = null) {
		pattern = pattern ? pattern.toString() : '';

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

			if (arg == '--update-geolocation-disabled') {
				Note.updateGeolocationEnabled_ = false;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--stack-trace-enabled') {
				//vorpalUtils.setStackTraceEnabled(true);
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--log-level') {
				if (!nextArg) throw new Error(_('Usage: %s', '--log-level <none|error|warn|info|debug>'));
				matched.logLevel = Logger.levelStringToId(nextArg);
				argv.splice(0, 2);
				continue;
			}

			if (arg == '--completion' || arg == '--compbash' || arg == '--compgen') {
				// Handled by omelette
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--autocompletion') {
				this.autocompletion_.active = true;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--autocompletion') {
				this.autocompletion_.active = true;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--ac-install') {
				this.autocompletion_.install = true;
				argv.splice(0, 1);
				continue;
			}

			if (arg == '--ac-current') {
				if (!nextArg) throw new Error(_('Usage: %s', '--ac-current <num>'));
				this.autocompletion_.current = nextArg;
				argv.splice(0, 2);
				continue;
			}

			if (arg == '--ac-line') {
				if (!nextArg) throw new Error(_('Usage: %s', '--ac-line <line>'));
				let line = nextArg.replace(/\|__QUOTE__\|/g, '"');
				line = line.split('|__SEP__|');
				this.autocompletion_.line = line;
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

	onLocaleChanged() {
		return;

		let currentCommands = this.vorpal().commands;
		for (let i = 0; i < currentCommands.length; i++) {
			let cmd = currentCommands[i];
			if (cmd._name == 'help') {
				cmd.description(_('Provides help for a given command.'));
			} else if (cmd._name == 'exit') {
				cmd.description(_('Exits the application.'));
			} else if (cmd.__commandObject) {
				cmd.description(cmd.__commandObject.description());
			}
		}
	}

	baseModelListener(action) {
		switch (action.type) {

			case 'NOTES_UPDATE_ONE':
			case 'NOTES_DELETE':
			case 'FOLDERS_UPDATE_ONE':
			case 'FOLDER_DELETE':

				//reg.scheduleSync();
				break;

		}
	}

	commands() {
		if (this.allCommandsLoaded_) return this.commands_;

		fs.readdirSync(__dirname).forEach((path) => {
			if (path.indexOf('command-') !== 0) return;
			const ext = fileExtension(path)
			if (ext != 'js') return;

			let CommandClass = require('./' + path);
			let cmd = new CommandClass();
			if (!cmd.enabled()) return;

			cmd.log = (...object) => {
				return console.log(...object);
			}

			this.commands_[cmd.name()] = cmd;
		});

		this.allCommandsLoaded_ = true;

		return this.commands_;
	}

	async commandNames() {
		const metadata = await this.commandMetadata();
		let output = [];
		for (let n in metadata) {
			if (!metadata.hasOwnProperty(n)) continue;
			output.push(n);
		}
		return output;
	}

	async commandMetadata() {
		if (this.commandMetadata_) return this.commandMetadata_;

		const storage = require('node-persist');
		await storage.init({ dir: 'commandMetadata', ttl: 1000 * 60 * 60 * 24 });

		let output = await storage.getItem('metadata');
		if (Setting.value('env') != 'dev' && output) {
			this.commandMetadata_ = output;
			return Object.assign({}, this.commandMetadata_);
		}

		const commands = this.commands();

		output = {};
		for (let n in commands) {
			if (!commands.hasOwnProperty(n)) continue;
			const cmd = commands[n];
			output[n] = cmd.metadata();
		}

		await storage.setItem('metadata', output);

		this.commandMetadata_ = output;
		return Object.assign({}, this.commandMetadata_);
	}

	findCommandByName(name) {
		if (this.commands_[name]) return this.commands_[name];

		let CommandClass = null;
		try {
			CommandClass = require('./command-' + name + '.js');
		} catch (error) {
			let e = new Error('No such command: ' + name);
			e.type = 'notFound';
			throw e;
		}
		let cmd = new CommandClass();

		cmd.log = (...object) => {
			return console.log(...object);
		}

		this.commands_[name] = cmd;
		return this.commands_[name];
	}

	async execCommand(argv) {
		if (!argv.length) throw new Error('Empty command');
		const commandName = argv[0];
		this.activeCommand_ = this.findCommandByName(commandName);
		const cmdArgs = cliUtils.makeCommandArgs(this.activeCommand_, argv);
		await this.activeCommand_.action(cmdArgs);
	}

	async cancelCurrentCommand() {
		await this.activeCommand_.cancel();
	}

	async start() {
		let argv = process.argv;
		let startFlags = await this.handleStartFlags_(argv);
		argv = startFlags.argv;
		let initArgs = startFlags.matched;
		if (argv.length) this.showPromptString_ = false;

		Setting.setConstant('appName', initArgs.env == 'dev' ? 'joplindev' : 'joplin');

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
		reg.dispatch = (o) => {};

		this.dbLogger_.addTarget('file', { path: profileDir + '/log-database.txt' });
		this.dbLogger_.setLevel(initArgs.logLevel);

		const packageJson = require('./package.json');
		this.logger_.info(sprintf('Starting %s %s (%s)...', packageJson.name, packageJson.version, Setting.value('env')));
		this.logger_.info('Profile directory: ' + profileDir);

		this.database_ = new JoplinDatabase(new DatabaseDriverNode());
		this.database_.setLogger(this.dbLogger_);
		await this.database_.open({ name: profileDir + '/database.sqlite' });

		reg.setDb(this.database_);
		BaseModel.db_ = this.database_;
		BaseModel.dispatch = (action) => { this.baseModelListener(action) }

		await Setting.load();

		if (Setting.value('firstStart')) {
			let locale = process.env.LANG;
			if (!locale) locale = defaultLocale();
			locale = locale.split('.');
			locale = locale[0];
			reg.logger().info('First start: detected locale as ' + locale);
			Setting.setValue('locale', closestSupportedLocale(locale));
			Setting.setValue('firstStart', 0)
		}

		setLocale(Setting.value('locale'));

		let currentFolderId = Setting.value('activeFolderId');
		this.currentFolder_ = null;
		if (currentFolderId) this.currentFolder_ = await Folder.load(currentFolderId);
		if (!this.currentFolder_) this.currentFolder_ = await Folder.defaultFolder();
		Setting.setValue('activeFolderId', this.currentFolder_ ? this.currentFolder_.id : '');

		if (this.autocompletion_.active) {
			if (this.autocompletion_.install) {
				try {
					installAutocompletionFile(Setting.value('appName'), Setting.value('profileDir'));
				} catch (error) {
					if (error.code == 'shellNotSupported') {
						console.info(error.message);
						return;
					}
					throw error;
				}
			} else {
				let items = await handleAutocompletion(this.autocompletion_);
				if (!items.length) return;
				for (let i = 0; i < items.length; i++) {
					items[i] = items[i].replace(/ /g, '\\ ');
				}
				console.info(items.join("\n"));
			}
			
			return;
		}

		try {
			await this.execCommand(argv);
		} catch (error) {
			console.info(error);
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