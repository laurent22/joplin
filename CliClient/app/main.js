require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { Database } from 'lib/database.js';
import { DatabaseDriverNode } from 'lib/database-driver-node.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { Logger } from 'lib/logger.js';
import { uuid } from 'lib/uuid.js';
import { sprintf } from 'sprintf-js';
import { importEnex } from 'import-enex';
import { filename, basename } from 'lib/path-utils.js';
import { _ } from 'lib/locale.js';
import os from 'os';
import fs from 'fs-extra';

//const dataDir = os.homedir() + '/.local/share/' + Setting.value('appName');
const dataDir = os.homedir() + '/Temp/TestJoplin';
const resourceDir = dataDir + '/resources';

Setting.setConstant('dataDir', dataDir);
Setting.setConstant('resourceDir', resourceDir);

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const logger = new Logger();
logger.addTarget('file', { path: dataDir + '/log.txt' });
logger.setLevel(Logger.LEVEL_DEBUG);

const dbLogger = new Logger();
dbLogger.addTarget('file', { path: dataDir + '/log-database.txt' });
dbLogger.setLevel(Logger.LEVEL_DEBUG);

const syncLogger = new Logger();
syncLogger.addTarget('file', { path: dataDir + '/log-sync.txt' });
syncLogger.setLevel(Logger.LEVEL_DEBUG);

let db = new Database(new DatabaseDriverNode());
db.setDebugMode(true);
db.setLogger(dbLogger);

let synchronizer_ = null;
const vorpal = require('vorpal')();

async function main() {
	await fs.mkdirp(dataDir, 0o755);
	await fs.mkdirp(resourceDir, 0o755);

	await db.open({ name: dataDir + '/database2.sqlite' });
	BaseModel.db_ = db;
	await Setting.load();




	// console.info('DELETING ALL DATA');
	// await db.exec('DELETE FROM notes');
	// await db.exec('DELETE FROM changes');
	// await db.exec('DELETE FROM folders');
	// await db.exec('DELETE FROM resources');
	// await db.exec('DELETE FROM deleted_items');
	// await db.exec('DELETE FROM tags');
	// await db.exec('DELETE FROM note_tags');
	// let folder1 = await Folder.save({ title: 'test1' });
	// let folder2 = await Folder.save({ title: 'test2' });
	// await importEnex(folder1.id, '/mnt/c/Users/Laurent/Desktop/Laurent.enex');
	// return;


	// let testglob = await Note.glob('title', 'La *', {
	// 	fields: ['title', 'updated_time'],
	// });
	// console.info(testglob);






	let commands = [];
	let currentFolder = null;

	async function synchronizer(remoteBackend) {
		if (synchronizer_) return synchronizer_;

		let fileApi = null;

		if (remoteBackend == 'onedrive') {
			const CLIENT_ID = 'e09fc0de-c958-424f-83a2-e56a721d331b';
			const CLIENT_SECRET = 'JA3cwsqSGHFtjMwd5XoF5L5';

			let driver = new FileApiDriverOneDrive(CLIENT_ID, CLIENT_SECRET);
			let auth = Setting.value('sync.onedrive.auth');
			
			if (auth) {
				auth = JSON.parse(auth);
			} else {
				auth = await driver.api().oauthDance();
				Setting.setValue('sync.onedrive.auth', JSON.stringify(auth));
			}

			driver.api().setAuth(auth);
			driver.api().on('authRefreshed', (a) => {
				Setting.setValue('sync.onedrive.auth', JSON.stringify(a));
			});

			let appDir = await driver.api().appDirectory();
			logger.info('App dir: ' + appDir);
			fileApi = new FileApi(appDir, driver);
			fileApi.setLogger(logger);
		} else {
			throw new Error('Unknown backend: ' + remoteBackend);
		}

		synchronizer_ = new Synchronizer(db, fileApi);
		synchronizer_.setLogger(syncLogger);

		return synchronizer_;
	}

	// let s = await synchronizer('onedrive');
	// await synchronizer_.start();
	// return;

	function switchCurrentFolder(folder) {
		if (!folder) throw new Error(_('No active folder is defined.'));

		currentFolder = folder;
		Setting.setValue('activeFolderId', folder.id);
		updatePrompt();
	}

	function promptString() {
		let path = '~';
		if (currentFolder) {
			path += '/' + currentFolder.title;
		}
		return 'joplin:' + path + '$ ';
	}

	function updatePrompt() {
		vorpal.delimiter(promptString());
	}

	// For now, to go around this issue: https://github.com/dthree/vorpal/issues/114
	function quotePromptArg(s) {
		if (s.indexOf(' ') >= 0) {
			return '"' + s + '"';
		}
		return s;
	}

	function autocompleteFolders() {
		return Folder.all().then((folders) => {
			let output = [];
			for (let i = 0; i < folders.length; i++) {
				output.push(quotePromptArg(folders[i].title));
			}
			output.push('..');
			output.push('.');
			return output;
		});
	}

	function autocompleteItems() {
		let promise = null;
		if (!currentFolder) {
			promise = Folder.all();
		} else {
			promise = Note.previews(currentFolder.id);
		}

		return promise.then((items) => {
			let output = [];
			for (let i = 0; i < items.length; i++) {
				output.push(quotePromptArg(items[i].title));
			}
			return output;			
		});
	}

	function cmdError(commandInstance, msg, end) {
		commandInstance.log(msg);
		end();
	}

	function cmdPromptConfirm(commandInstance, message) {
		return new Promise((resolve, reject) => {
			let options = {
				type: 'confirm',
				name: 'ok',
				default: false, // This needs to be false so that, when pressing Ctrl+C, the prompt returns false
				message: message,
			};
			commandInstance.prompt(options, (result) => {
				if (result.ok) {
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	}

	process.stdin.on('keypress', (_, key) => {
		if (key && key.name === 'return') {
			updatePrompt();
		}

		if (key.name === 'tab') {
			vorpal.ui.imprint();
			vorpal.log(vorpal.ui.input());
		}
	});

	commands.push({
		usage: 'mkbook <notebook-title>',
		aliases: ['mkdir'],
		description: 'Creates a new notebook',
		action: function(args, end) {
			Folder.save({ title: args['notebook-title'] }).catch((error) => {
				this.log(error);
			}).then((folder) => {
				switchCurrentFolder(folder);
				end();
			});
		},
	});

	commands.push({
		usage: 'mknote <note-title>',
		aliases: ['touch'],
		description: 'Creates a new note',
		action: function(args, end) {
			if (!currentFolder) {
				this.log('Notes can only be created within a notebook.');
				end();
				return;
			}

			let note = {
				title: args['note-title'],
				parent_id: currentFolder.id,
			};
			Note.save(note).catch((error) => {
				this.log(error);
			}).then((note) => {
				end();
			});
		},
	});

	commands.push({
		usage: 'use <notebook-title>',
		aliases: ['cd'],
		description: 'Switches to [notebook-title] - all further operations will happen within this notebook.',
		action: async function(args, end) {
			let folderTitle = args['notebook-title'];

			let folder = await Folder.loadByField('title', folderTitle);
			if (!folder) return cmdError(this, _('Invalid folder title: %s', folderTitle), end);
			switchCurrentFolder(folder);
			end();
		},
		autocomplete: autocompleteFolders,
	});

	commands.push({
		usage: 'set <item-title> <prop-name> [prop-value]',
		description: 'Sets the given <prop-name> of the given item.',
		action: function(args, end) {
			let promise = null;
			let title = args['item-title'];
			let propName = args['prop-name'];
			let propValue = args['prop-value'];
			if (!propValue) propValue = '';

			if (!currentFolder) {
				promise = Folder.loadByField('title', title);
			} else {
				promise = Folder.loadNoteByField(currentFolder.id, 'title', title);
			}

			promise.then((item) => {
				if (!item) {
					this.log(_('No item with title "%s" found.', title));
					end();
					return;
				}

				let newItem = {
					id: item.id,
					type_: item.type_,
				};
				newItem[propName] = propValue;
				let ItemClass = BaseItem.itemClass();
				return ItemClass.save(newItem);
			}).catch((error) => {
				this.log(error);
			}).then(() => {
				end();
			});
		},
		autocomplete: autocompleteItems,
	});

	commands.push({
		usage: 'cat <item-title>',
		description: 'Displays the given item data.',
		action: function(args, end) {
			let title = args['item-title'];

			let promise = null;
			if (!currentFolder) {
				promise = Folder.loadByField('title', title);
			} else {
				promise = Folder.loadNoteByField(currentFolder.id, 'title', title);
			}

			promise.then((item) => {
				if (!item) {
					this.log(_('No item with title "%s" found.', title));
					end();
					return;
				}

				if (!currentFolder) {
					this.log(Folder.serialize(item));
				} else {
					this.log(Note.serialize(item));
				}
			}).catch((error) => {
				this.log(error);
			}).then(() => {
				end();
			});
		},
		autocomplete: autocompleteItems,
	});

	commands.push({
		usage: 'rm <pattern>',
		description: 'Deletes the given item. For a notebook, all the notes within that notebook will be deleted. Use `rm ../<notebook-name>` to delete a notebook.',
		action: async function(args, end) {
			let pattern = args['pattern'];
			let itemType = null;

			if (pattern.indexOf('*') < 0) { // Handle it as a simple title
				if (pattern.substr(0, 3) == '../') {
					itemType = BaseModel.MODEL_TYPE_FOLDER;
					pattern = pattern.substr(3);
				} else {
					itemType = BaseModel.MODEL_TYPE_NOTE;
				}

				let item = await BaseItem.loadItemByField(itemType, 'title', pattern);
				if (!item) return cmdError(this, _('No item with title "%s" found.', pattern), end);
				await BaseItem.deleteItem(itemType, item.id);

				if (currentFolder && currentFolder.id == item.id) {
					let f = await Folder.defaultFolder();
					switchCurrentFolder(f);
				}
			} else { // Handle it as a glob pattern
				let notes = await Note.previews(currentFolder.id, { titlePattern: pattern });
				if (!notes.length) return cmdError(this, _('No note matches this pattern: "%s"', pattern), end);
				let ok = await cmdPromptConfirm(this, _('%d notes match this pattern. Delete them?', notes.length));
				if (ok) {
					for (let i = 0; i < notes.length; i++) {
						await Note.delete(notes[i].id);
					}
				}
			}

			end();
		},
		autocomplete: autocompleteItems,
	});

	commands.push({
		usage: 'ls [pattern]',
		description: 'Displays the notes in [notebook-title]. Use `ls ..` to display the list of notebooks.',
		options: [
			['-n, --lines <num>', 'Displays only the first top <num> lines.'],
			['-s, --sort <field>', 'Sorts the item by <field> (eg. title, updated_time, created_time).'],
			['-r, --reverse', 'Reverses the sorting order.'],
			['-t, --type <type>', 'Displays only the items of the specific type(s). Can be `n` for notes, `t` for todos, or `nt` for notes and todos (eg. `-tt` would display only the todos, while `-ttd` would display notes and todos.'],
		],
		action: async function(args, end) {
			let pattern = args['pattern'];
			let suffix = '';
			let items = [];
			let options = args.options;

			let queryOptions = {};
			if (options.lines) queryOptions.limit = options.lines;
			if (options.sort) {
				queryOptions.orderBy = options.sort;
				queryOptions.orderByDir = 'ASC';
			}
			if (options.reverse === true) queryOptions.orderByDir = queryOptions.orderByDir == 'ASC' ? 'DESC' : 'ASC';
			queryOptions.caseInsensitive = true;
			if (options.type) {
				queryOptions.itemTypes = [];
				if (options.type.indexOf('n') >= 0) queryOptions.itemTypes.push('note');
				if (options.type.indexOf('t') >= 0) queryOptions.itemTypes.push('todo');
			}
			if (pattern) queryOptions.titlePattern = pattern;

			if (pattern == '..') {
				items = await Folder.all(queryOptions);
				suffix = '/';
			} else {
				items = await Note.previews(currentFolder.id, queryOptions);
			}

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let line = '';
				if (!!item.is_todo) {
					line += sprintf('[%s] ', !!item.todo_completed ? 'X' : ' ');
				}
				line += item.title + suffix;
				this.log(line);
			}

			end();
		},
		autocomplete: autocompleteFolders,
	});

	commands.push({
		usage: 'sync',
		description: 'Synchronizes with remote storage.',
		action: function(args, end) {
			synchronizer('onedrive').then((s) => {
				return s.start();
			}).catch((error) => {
				logger.error(error);
			}).then(() => {
				end();
			});
		},
	});

	commands.push({
		usage: 'import-enex <file> [notebook-title]',
		description: _('Imports en Evernote notebook file (.enex file).'),
		options: [
			['--fuzzy-matching', 'For debugging purposes. Do not use.'],
		],
		action: async function(args, end) {
			let filePath = args.file;
			let folder = null;
			let folderTitle = args['notebook-title'];

			if (folderTitle) {
				folder = await Folder.loadByField('title', folderTitle);
				if (!folder) return cmdError(this, _('Folder does not exists: "%s"', folderTitle), end);
			} else {
				folderTitle = filename(filePath);
				folderTitle = _('Imported - %s', folderTitle);
				let inc = 0;
				while (true) {
					let t = folderTitle + (inc ? ' (' + inc + ')' : '');
					let f = await Folder.loadByField('title', t);
					if (!f) {
						folderTitle = t;
						break;
					}
					inc++;
				}
			}

			let ok = await cmdPromptConfirm(this, _('File "%s" will be imported into notebook "%s". Continue?', basename(filePath), folderTitle))

			if (!ok) {
				end();
				return;
			}

			let options = {
				fuzzyMatching: args.options['fuzzy-matching'] === true,
			}

			folder = !folder ? await Folder.save({ title: folderTitle }) : folder;
			this.log(_('Importing notes...'));
			await importEnex(folder.id, filePath, options);
			this.log(_('The notes have been imported into "%s"', folderTitle));

			end();			
		},
	});

	function commandByName(name) {
		for (let i = 0; i < commands.length; i++) {
			let c = commands[i];
			let n = c.usage.split(' ');
			n = n[0];
			if (n == name) return c;
			if (c.aliases && c.aliases.indexOf(name) >= 0) return c;
		}
		return null;
	}

	function execCommand(name, args) {
		return new Promise((resolve, reject) => {
			let cmd = commandByName(name);
			if (!cmd) {
				reject(new Error('Unknown command: ' + name));
			} else {
				cmd.action(args, function() {
					resolve();
				});
			}
		});
	}

	for (let commandIndex = 0; commandIndex < commands.length; commandIndex++) {
		let c = commands[commandIndex];
		let o = vorpal.command(c.usage, c.description);
		if (c.options) {
			for (let i = 0; i < c.options.length; i++) {
				let options = c.options[i];
				if (options.length == 2) o.option(options[0], options[1]);
				if (options.length == 3) o.option(options[0], options[1], options[2]);
			}
		}
		if (c.aliases) {
			for (let i = 0; i < c.aliases.length; i++) {
				o.alias(c.aliases[i]);
			}
		}
		if (c.autocomplete) {
			o.autocomplete({
				data: c.autocomplete,
			});
		}
		o.action(c.action);
	}

	vorpal.history('net.cozic.joplin'); // Enables persistent history

	let activeFolderId = Setting.value('activeFolderId');
	let activeFolder = null;
	if (activeFolderId) activeFolder = await Folder.load(activeFolderId);
	if (!activeFolder) activeFolder = await Folder.defaultFolder();
	if (activeFolder) await execCommand('cd', { 'notebook-title': activeFolder.title }); // Use execCommand() so that no history entry is created

	vorpal.delimiter(promptString()).show();

	vorpal.on('client_prompt_submit', function(cmd) {
		// Called when command is started
	});

	vorpal.on('client_command_executed', function(cmd) {
		// Called when command is finished
	});
}

main().catch((error) => {
	console.error('Fatal error: ', error);
});