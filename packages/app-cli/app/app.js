const BaseApplication = require('@joplin/lib/BaseApplication').default;
const { FoldersScreenUtils } = require('@joplin/lib/folders-screen-utils.js');
const ResourceService = require('@joplin/lib/services/ResourceService').default;
const BaseModel = require('@joplin/lib/BaseModel').default;
const Folder = require('@joplin/lib/models/Folder').default;
const BaseItem = require('@joplin/lib/models/BaseItem').default;
const Note = require('@joplin/lib/models/Note').default;
const Tag = require('@joplin/lib/models/Tag').default;
const Setting = require('@joplin/lib/models/Setting').default;
const { reg } = require('@joplin/lib/registry.js');
const { fileExtension } = require('@joplin/lib/path-utils');
const { splitCommandString } = require('@joplin/utils');
const { splitCommandBatch } = require('@joplin/lib/string-utils');
const { _ } = require('@joplin/lib/locale');
const fs = require('fs-extra');
const { cliUtils } = require('./cli-utils.js');
const Cache = require('@joplin/lib/Cache');
const RevisionService = require('@joplin/lib/services/RevisionService').default;
const shim = require('@joplin/lib/shim').default;
const setupCommand = require('./setupCommand').default;

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
		const output = await this.loadItems(type, pattern, options);

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

		if (type === BaseModel.TYPE_FOLDER && (pattern === Folder.conflictFolderTitle() || pattern === Folder.conflictFolderId())) return [Folder.conflictFolder()];

		if (!options) options = {};

		const parent = options.parent ? options.parent : app().currentFolder();
		const ItemClass = BaseItem.itemClass(type);

		if (type === BaseModel.TYPE_NOTE && pattern.indexOf('*') >= 0) {
			// Handle it as pattern
			if (!parent) throw new Error(_('No notebook selected.'));
			return await Note.previews(parent.id, { titlePattern: pattern });
		} else {
			// Single item
			let item = null;
			if (type === BaseModel.TYPE_NOTE) {
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

	setupCommand(cmd) {
		return setupCommand(cmd, t => this.stdout(t), () => this.store(), () => this.gui());
	}

	stdout(text) {
		return this.gui().stdout(text);
	}

	async exit(code = 0) {
		const doExit = async () => {
			this.gui().exit();
			await super.exit(code);
		};

		// Give it a few seconds to cancel otherwise exit anyway
		shim.setTimeout(async () => {
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
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			fs.readdirSync(__dirname).forEach(path => {
				if (path.indexOf('command-') !== 0) return;
				if (path.endsWith('.test.js')) return;
				const ext = fileExtension(path);
				if (ext !== 'js') return;

				const CommandClass = require(`./${path}`);
				let cmd = new CommandClass();
				if (!cmd.enabled()) return;
				cmd = this.setupCommand(cmd);
				this.commands_[cmd.name()] = cmd;
			});

			this.allCommandsLoaded_ = true;
		}

		if (uiType !== null) {
			const temp = [];
			for (const n in this.commands_) {
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
		const output = [];
		for (const n in metadata) {
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
			return { ...this.commandMetadata_ };
		}

		const commands = this.commands();

		output = {};
		for (const n in commands) {
			if (!commands.hasOwnProperty(n)) continue;
			const cmd = commands[n];
			output[n] = cmd.metadata();
		}

		await this.cache_.setItem('metadata', output, 1000 * 60 * 60 * 24);

		this.commandMetadata_ = output;
		return { ...this.commandMetadata_ };
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
				const e = new Error(_('No such command: %s', name));
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
				// eslint-disable-next-line no-console
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
			{ keys: ['n'], type: 'function', command: 'next_link' },
			{ keys: ['b'], type: 'function', command: 'previous_link' },
			{ keys: ['o'], type: 'function', command: 'open_link' },
			{ keys: [' '], command: 'todo toggle $n' },
			{ keys: ['tc'], type: 'function', command: 'toggle_console' },
			{ keys: ['tm'], type: 'function', command: 'toggle_metadata' },
			{ keys: ['ti'], type: 'function', command: 'toggle_ids' },
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
		for (const n in itemsByCommand) {
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

	async commandList(argv) {
		if (argv.length && argv[0] === 'batch') {
			const commands = [];
			const commandLines = splitCommandBatch(await fs.readFile(argv[1], 'utf-8'));

			for (const commandLine of commandLines) {
				if (!commandLine.trim()) continue;
				const splitted = splitCommandString(commandLine.trim());
				commands.push(splitted);
			}
			return commands;
		} else {
			return [argv];
		}
	}

	// We need this special case here because by the time the `version` command
	// runs, the keychain has already been setup.
	checkIfKeychainEnabled(argv) {
		return argv.indexOf('version') < 0;
	}

	async start(argv) {
		const keychainEnabled = this.checkIfKeychainEnabled(argv);

		argv = await super.start(argv, { keychainEnabled });

		cliUtils.setStdout(object => {
			return this.stdout(object);
		});

		this.initRedux();

		// If we have some arguments left at this point, it's a command
		// so execute it.
		if (argv.length) {
			this.gui_ = this.dummyGui();

			this.currentFolder_ = await Folder.load(Setting.value('activeFolderId'));

			await this.applySettingsSideEffects();

			try {
				const commands = await this.commandList(argv);
				for (const command of commands) {
					await this.execCommand(command);
				}
			} catch (error) {
				if (this.showStackTraces_) {
					console.error(error);
				} else {
					// eslint-disable-next-line no-console
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
			const keymap = await this.loadKeymaps();

			const AppGui = require('./app-gui.js');
			this.gui_ = new AppGui(this, this.store(), keymap);
			this.gui_.setLogger(this.logger());
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

			this.startRotatingLogMaintenance(Setting.value('profileDir'));
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
