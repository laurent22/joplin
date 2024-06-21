import BaseApplication from '@joplin/lib/BaseApplication';
import { refreshFolders } from '@joplin/lib/folders-screen-utils.js';
import ResourceService from '@joplin/lib/services/ResourceService';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import Tag from '@joplin/lib/models/Tag';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry.js';
import { fileExtension } from '@joplin/lib/path-utils';
import { splitCommandString } from '@joplin/utils';
import { _ } from '@joplin/lib/locale';
import { pathExists, readFile, readdirSync } from 'fs-extra';
import RevisionService from '@joplin/lib/services/RevisionService';
import shim from '@joplin/lib/shim';
import setupCommand from './setupCommand';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
const { cliUtils } = require('./cli-utils.js');
const Cache = require('@joplin/lib/Cache');
const { splitCommandBatch } = require('@joplin/lib/string-utils');

class Application extends BaseApplication {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private commands_: Record<string, any> = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private commandMetadata_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private activeCommand_: any = null;
	private allCommandsLoaded_ = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private gui_: any = null;
	private cache_ = new Cache();

	public gui() {
		return this.gui_;
	}

	public commandStdoutMaxWidth() {
		return this.gui().stdoutMaxWidth();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async guessTypeAndLoadItem(pattern: string, options: any = null) {
		let type = BaseModel.TYPE_NOTE;
		if (pattern.indexOf('/') === 0) {
			type = BaseModel.TYPE_FOLDER;
			pattern = pattern.substr(1);
		}
		return this.loadItem(type, pattern, options);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async loadItem(type: ModelType | 'folderOrNote', pattern: string, options: any = null) {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async loadItems(type: ModelType | 'folderOrNote', pattern: string, options: any = null): Promise<(FolderEntity | NoteEntity)[]> {
		if (type === 'folderOrNote') {
			const folders: FolderEntity[] = await this.loadItems(BaseModel.TYPE_FOLDER, pattern, options);
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
				item = await (ItemClass as typeof Note).loadFolderNoteByField(parent.id, 'title', pattern);
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

	public setupCommand(cmd: string) {
		return setupCommand(cmd, (t: string) => this.stdout(t), () => this.store(), () => this.gui());
	}

	public stdout(text: string) {
		return this.gui().stdout(text);
	}

	public async exit(code = 0) {
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

	public commands(uiType: string = null) {
		if (!this.allCommandsLoaded_) {
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			readdirSync(__dirname).forEach(path => {
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const temp: Record<string, any> = {};
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

	public async commandNames() {
		const metadata = await this.commandMetadata();
		const output = [];
		for (const n in metadata) {
			if (!metadata.hasOwnProperty(n)) continue;
			output.push(n);
		}
		return output;
	}

	public async commandMetadata() {
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

	public hasGui() {
		return this.gui() && !this.gui().isDummy();
	}

	public findCommandByName(name: string) {
		if (this.commands_[name]) return this.commands_[name];

		let CommandClass = null;
		try {
			CommandClass = require(`${__dirname}/command-${name}.js`);
		} catch (error) {
			if (error.message && error.message.indexOf('Cannot find module') >= 0) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				const e: any = new Error(_('No such command: %s', name));
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

	public dummyGui() {
		return {
			isDummy: () => {
				return true;
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			prompt: (initialText = '', promptString = '', options: any = null) => {
				return cliUtils.prompt(initialText, promptString, options);
			},
			showConsole: () => {},
			maximizeConsole: () => {},
			stdout: (text: string) => {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async execCommand(argv: string[]): Promise<any> {
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

	public currentCommand() {
		return this.activeCommand_;
	}

	public async loadKeymaps() {
		interface KeyMapItem {
			keys: string[];
			type: 'function' | 'prompt';
			command: string;
			cursorPosition?: number;
		}

		const defaultKeyMap: KeyMapItem[] = [
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
			{ keys: [' '], type: 'prompt', command: 'todo toggle $n' },
			{ keys: ['tc'], type: 'function', command: 'toggle_console' },
			{ keys: ['tm'], type: 'function', command: 'toggle_metadata' },
			{ keys: ['ti'], type: 'function', command: 'toggle_ids' },
			{ keys: ['r'], type: 'prompt', command: 'restore $n' },
			{ keys: ['/'], type: 'prompt', command: 'search ""', cursorPosition: -2 },
			{ keys: ['mn'], type: 'prompt', command: 'mknote ""', cursorPosition: -2 },
			{ keys: ['mt'], type: 'prompt', command: 'mktodo ""', cursorPosition: -2 },
			{ keys: ['mb'], type: 'prompt', command: 'mkbook ""', cursorPosition: -2 },
			{ keys: ['yn'], type: 'prompt', command: 'cp $n ""', cursorPosition: -2 },
			{ keys: ['dn'], type: 'prompt', command: 'mv $n ""', cursorPosition: -2 },
		];

		// Filter the keymap item by command so that items in keymap.json can override
		// the default ones.
		const itemsByCommand: Record<string, KeyMapItem> = {};

		for (let i = 0; i < defaultKeyMap.length; i++) {
			itemsByCommand[defaultKeyMap[i].command] = defaultKeyMap[i];
		}

		const filePath = `${Setting.value('profileDir')}/keymap.json`;
		if (await pathExists(filePath)) {
			try {
				let configString = await readFile(filePath, 'utf-8');
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

	public async commandList(argv: string[]) {
		if (argv.length && argv[0] === 'batch') {
			const commands = [];
			const commandLines = splitCommandBatch(await readFile(argv[1], 'utf-8'));

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
	public checkIfKeychainEnabled(argv: string[]) {
		return argv.indexOf('version') < 0;
	}

	public async start(argv: string[]) {
		const keychainEnabled = this.checkIfKeychainEnabled(argv);

		argv = await super.start(argv, { keychainEnabled });

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		cliUtils.setStdout((object: any) => {
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

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			await refreshFolders((action: any) => this.store().dispatch(action), '');

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

let application_: Application = null;

function app() {
	if (application_) return application_;
	application_ = new Application();
	return application_;
}

export default app;
