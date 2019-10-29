const { BaseApplication } = require('lib/BaseApplication');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const ResourceService = require('lib/services/ResourceService');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const BaseItem = require('lib/models/BaseItem.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const Setting = require('lib/models/Setting.js');
const { reg } = require('lib/registry.js');
const { fileExtension } = require('lib/path-utils.js');
const { _ } = require('lib/locale.js');
const fs = require('fs-extra');
const { cliUtils } = require('./cli-utils.js');
const Cache = require('lib/Cache');
const RevisionService = require('lib/services/RevisionService');

class Application extends BaseApplication {
	constructor() {
		super();

		this.showPromptString_ = true;
		this.commands_ = {};
		this.commandMetadata_ = null;
		this.activeCommand_ = null;
		this.allCommandsLoaded_ = false;
		this.showStackTraces_ = false;
		this.gui_ = null;
		this.cache_ = new Cache();
	}

	gui() {
		return this.gui_;
	}

	commandStdoutMaxWidth() {
		return this.gui().stdoutMaxWidth();
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

		if (output.length > 1) {
			// output.sort((a, b) => { return a.user_updated_time < b.user_updated_time ? +1 : -1; });

			// let answers = { 0: _('[Cancel]') };
			// for (let i = 0; i < output.length; i++) {
			// 	answers[i + 1] = output[i].title;
			// }

			// Not really useful with new UI?
			throw new Error(_('More than one item match "%s". Please narrow down your query.', pattern));

			// let msg = _('More than one item match "%s". Please select one:', pattern);
			// const response = await cliUtils.promptMcq(msg, answers);
			// if (!response) return null;

			// return output[response - 1];
		} else {
			return output.length ? output[0] : null;
		}
	}

	async loadItems(type, pattern, options = null) {
		if (type === 'folderOrNote') {
			const folders = await this.loadItems(BaseModel.TYPE_FOLDER, pattern, options);
			if (folders.length) return folders;
			return await this.loadItems(BaseModel.TYPE_NOTE, pattern, options);
		}

		pattern = pattern ? pattern.toString() : '';

		if (type == BaseModel.TYPE_FOLDER && (pattern == Folder.conflictFolderTitle() || pattern == Folder.conflictFolderId())) return [Folder.conflictFolder()];

		if (!options) options = {};

		const parent = options.parent ? options.parent : app().currentFolder();
		const ItemClass = BaseItem.itemClass(type);

		if (type == BaseModel.TYPE_NOTE && pattern.indexOf('*') >= 0) {
			// Handle it as pattern
			if (!parent) throw new Error(_('No notebook selected.'));
			return await Note.previews(parent.id, { titlePattern: pattern });
		} else {
			// Single item
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

			if (pattern.length >= 2) {
				return await ItemClass.loadByPartialId(pattern);
			}
		}

		return [];
	}

	stdout(text) {
		return this.gui().stdout(text);
	}

	setupCommand(cmd) {
		cmd.setStdout(text => {
			return this.stdout(text);
		});

		cmd.setDispatcher(action => {
			if (this.store()) {
				return this.store().dispatch(action);
			} else {
				return () => {};
			}
		});

		cmd.setPrompt(async (message, options) => {
			if (!options) options = {};
			if (!options.type) options.type = 'boolean';
			if (!options.booleanAnswerDefault) options.booleanAnswerDefault = 'y';
			if (!options.answers) options.answers = options.booleanAnswerDefault === 'y' ? [_('Y'), _('n')] : [_('N'), _('y')];

			if (options.type == 'boolean') {
				message += ` (${options.answers.join('/')})`;
			}

			let answer = await this.gui().prompt('', `${message} `, options);

			if (options.type === 'boolean') {
				if (answer === null) return false; // Pressed ESCAPE
				if (!answer) answer = options.answers[0];
				let positiveIndex = options.booleanAnswerDefault == 'y' ? 0 : 1;
				return answer.toLowerCase() === options.answers[positiveIndex].toLowerCase();
			} else {
				return answer;
			}
		});

		return cmd;
	}

	async exit(code = 0) {
		const doExit = async () => {
			this.gui().exit();
			await super.exit(code);
		};

		// Give it a few seconds to cancel otherwise exit anyway
		setTimeout(async () => {
			await doExit();
		}, 5000);

		if (await reg.syncTarget().syncStarted()) {
			this.stdout(_('Cancelling background synchronisation... Please wait.'));
			const sync = await reg.syncTarget().synchronizer();
			await sync.cancel();
		}

		await doExit();
	}

	commands(uiType = null) {
		if (!this.allCommandsLoaded_) {
			fs.readdirSync(__dirname).forEach(path => {
				if (path.indexOf('command-') !== 0) return;
				const ext = fileExtension(path);
				if (ext != 'js') return;

				let CommandClass = require(`./${path}`);
				let cmd = new CommandClass();
				if (!cmd.enabled()) return;
				cmd = this.setupCommand(cmd);
				this.commands_[cmd.name()] = cmd;
			});

			this.allCommandsLoaded_ = true;
		}

		if (uiType !== null) {
			let temp = [];
			for (let n in this.commands_) {
				if (!this.commands_.hasOwnProperty(n)) continue;
				const c = this.commands_[n];
				if (!c.supportsUi(uiType)) continue;
				temp[n] = c;
			}
			return temp;
		}

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

		let output = await this.cache_.getItem('metadata');
		if (output) {
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

		await this.cache_.setItem('metadata', output, 1000 * 60 * 60 * 24);

		this.commandMetadata_ = output;
		return Object.assign({}, this.commandMetadata_);
	}

	hasGui() {
		return this.gui() && !this.gui().isDummy();
	}

	findCommandByName(name) {
		if (this.commands_[name]) return this.commands_[name];

		let CommandClass = null;
		try {
			CommandClass = require(`${__dirname}/command-${name}.js`);
		} catch (error) {
			if (error.message && error.message.indexOf('Cannot find module') >= 0) {
				let e = new Error(_('No such command: %s', name));
				e.type = 'notFound';
				throw e;
			} else {
				throw error;
			}
		}

		let cmd = new CommandClass();
		cmd = this.setupCommand(cmd);
		this.commands_[name] = cmd;
		return this.commands_[name];
	}

	dummyGui() {
		return {
			isDummy: () => {
				return true;
			},
			prompt: (initialText = '', promptString = '', options = null) => {
				return cliUtils.prompt(initialText, promptString, options);
			},
			showConsole: () => {},
			maximizeConsole: () => {},
			stdout: text => {
				console.info(text);
			},
			fullScreen: () => {},
			exit: () => {},
			showModalOverlay: () => {},
			hideModalOverlay: () => {},
			stdoutMaxWidth: () => {
				return 100;
			},
			forceRender: () => {},
			termSaveState: () => {},
			termRestoreState: () => {},
		};
	}

	async execCommand(argv) {
		if (!argv.length) return this.execCommand(['help']);
		// reg.logger().debug('execCommand()', argv);
		const commandName = argv[0];
		this.activeCommand_ = this.findCommandByName(commandName);

		let outException = null;
		try {
			if (this.gui().isDummy() && !this.activeCommand_.supportsUi('cli')) throw new Error(_('The command "%s" is only available in GUI mode', this.activeCommand_.name()));
			const cmdArgs = cliUtils.makeCommandArgs(this.activeCommand_, argv);
			await this.activeCommand_.action(cmdArgs);
		} catch (error) {
			outException = error;
		}
		this.activeCommand_ = null;
		if (outException) throw outException;
	}

	currentCommand() {
		return this.activeCommand_;
	}

	async loadKeymaps() {
		const defaultKeyMap = [
			{ keys: [':'], type: 'function', command: 'enter_command_line_mode' },
			{ keys: ['TAB'], type: 'function', command: 'focus_next' },
			{ keys: ['SHIFT_TAB'], type: 'function', command: 'focus_previous' },
			{ keys: ['UP'], type: 'function', command: 'move_up' },
			{ keys: ['DOWN'], type: 'function', command: 'move_down' },
			{ keys: ['PAGE_UP'], type: 'function', command: 'page_up' },
			{ keys: ['PAGE_DOWN'], type: 'function', command: 'page_down' },
			{ keys: ['ENTER'], type: 'function', command: 'activate' },
			{ keys: ['DELETE', 'BACKSPACE'], type: 'function', command: 'delete' },
			{ keys: [' '], command: 'todo toggle $n' },
			{ keys: ['tc'], type: 'function', command: 'toggle_console' },
			{ keys: ['tm'], type: 'function', command: 'toggle_metadata' },
			{ keys: ['/'], type: 'prompt', command: 'search ""', cursorPosition: -2 },
			{ keys: ['mn'], type: 'prompt', command: 'mknote ""', cursorPosition: -2 },
			{ keys: ['mt'], type: 'prompt', command: 'mktodo ""', cursorPosition: -2 },
			{ keys: ['mb'], type: 'prompt', command: 'mkbook ""', cursorPosition: -2 },
			{ keys: ['yn'], type: 'prompt', command: 'cp $n ""', cursorPosition: -2 },
			{ keys: ['dn'], type: 'prompt', command: 'mv $n ""', cursorPosition: -2 },
		];

		// Filter the keymap item by command so that items in keymap.json can override
		// the default ones.
		const itemsByCommand = {};

		for (let i = 0; i < defaultKeyMap.length; i++) {
			itemsByCommand[defaultKeyMap[i].command] = defaultKeyMap[i];
		}

		const filePath = `${Setting.value('profileDir')}/keymap.json`;
		if (await fs.pathExists(filePath)) {
			try {
				let configString = await fs.readFile(filePath, 'utf-8');
				configString = configString.replace(/^\s*\/\/.*/, ''); // Strip off comments
				const keymap = JSON.parse(configString);
				for (let keymapIndex = 0; keymapIndex < keymap.length; keymapIndex++) {
					const item = keymap[keymapIndex];
					itemsByCommand[item.command] = item;
				}
			} catch (error) {
				let msg = error.message ? error.message : '';
				msg = `Could not load keymap ${filePath}\n${msg}`;
				error.message = msg;
				throw error;
			}
		}

		const output = [];
		for (let n in itemsByCommand) {
			if (!itemsByCommand.hasOwnProperty(n)) continue;
			output.push(itemsByCommand[n]);
		}

		// Map reserved shortcuts to their equivalent key
		// https://github.com/cronvel/terminal-kit/issues/101
		for (let i = 0; i < output.length; i++) {
			const newKeys = output[i].keys.map(k => {
				k = k.replace(/CTRL_H/g, 'BACKSPACE');
				k = k.replace(/CTRL_I/g, 'TAB');
				k = k.replace(/CTRL_M/g, 'ENTER');
				return k;
			});
			output[i].keys = newKeys;
		}

		return output;
	}

	async start(argv) {
		argv = await super.start(argv);

		cliUtils.setStdout(object => {
			return this.stdout(object);
		});

		// If we have some arguments left at this point, it's a command
		// so execute it.
		if (argv.length) {
			this.gui_ = this.dummyGui();

			this.currentFolder_ = await Folder.load(Setting.value('activeFolderId'));

			await this.applySettingsSideEffects();

			try {
				await this.execCommand(argv);
			} catch (error) {
				if (this.showStackTraces_) {
					console.error(error);
				} else {
					console.info(error.message);
				}
				process.exit(1);
			}

			await Setting.saveAll();

			// Need to call exit() explicitly, otherwise Node wait for any timeout to complete
			// https://stackoverflow.com/questions/18050095
			process.exit(0);
		} else {
			// Otherwise open the GUI
			this.initRedux();

			const keymap = await this.loadKeymaps();

			const AppGui = require('./app-gui.js');
			this.gui_ = new AppGui(this, this.store(), keymap);
			this.gui_.setLogger(this.logger_);
			await this.gui_.start();

			// Since the settings need to be loaded before the store is created, it will never
			// receive the SETTING_UPDATE_ALL even, which mean state.settings will not be
			// initialised. So we manually call dispatchUpdateAll() to force an update.
			Setting.dispatchUpdateAll();

			await FoldersScreenUtils.refreshFolders();

			const tags = await Tag.allWithNotes();

			ResourceService.runInBackground();

			RevisionService.instance().runInBackground();

			this.dispatch({
				type: 'TAG_UPDATE_ALL',
				items: tags,
			});

			this.store().dispatch({
				type: 'FOLDER_SELECT',
				id: Setting.value('activeFolderId'),
			});
		}
	}
}

let application_ = null;

function app() {
	if (application_) return application_;
	application_ = new Application();
	return application_;
}

module.exports = { app };
