#!/usr/bin/env node

require('source-map-support').install();
require('babel-plugin-transform-runtime');

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
import { Resource } from 'lib/models/resource.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Note } from 'lib/models/note.js';
import { Tag } from 'lib/models/tag.js';
import { NoteTag } from 'lib/models/note-tag.js';
import { Setting } from 'lib/models/setting.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { Logger } from 'lib/logger.js';
import { uuid } from 'lib/uuid.js';
import { sprintf } from 'sprintf-js';
import { importEnex } from 'import-enex';
import { vorpalUtils } from 'vorpal-utils.js';
import { reg } from 'lib/registry.js';
import { FsDriverNode } from './fs-driver-node.js';
import { filename, basename, fileExtension } from 'lib/path-utils.js';
import { shim } from 'lib/shim.js';
import { shimInit } from 'lib/shim-init-node.js';
import { _ } from 'lib/locale.js';
import os from 'os';
import fs from 'fs-extra';

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
});

const packageJson = require('./package.json');

let initArgs = {
	profileDir: null,
	env: 'prod',
}

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;

Setting.setConstant('appId', 'net.cozic.joplin-cli');
Setting.setConstant('appType', 'cli');

let currentFolder = null;
let commands = [];
let database_ = null;
let synchronizers_ = {};
let logger = new Logger();
let dbLogger = new Logger();
let syncLogger = new Logger();
let showPromptString = true;
let logLevel = Logger.LEVEL_INFO;

function commandFiles() {
    var results = [];
    const dir = __dirname;

    fs.readdirSync(dir).forEach(function(file) {
    	if (file.indexOf('command-') !== 0) return;
		const ext = fileExtension(file)
		if (ext != 'js') return;
      	file = dir+'/'+file;
    });
};

//commandFiles();

commands.push(require('./command-version.js'));

commands.push({
	usage: 'mkbook <notebook>',
	aliases: ['mkdir'],
	description: 'Creates a new notebook',
	action: function(args, end) {
		Folder.save({ title: args['notebook'] }, { duplicateCheck: true }).then((folder) => {
			switchCurrentFolder(folder);
		}).catch((error) => {
			vorpalUtils.log(this, error);
		}).then(() => {
			end();
		});
	},
});

commands.push({
	usage: 'mknote <note>',
	aliases: ['touch'],
	description: 'Creates a new note',
	action: async function(args, end) {
		if (!currentFolder) {
			this.log('Notes can only be created within a notebook.');
			end();
			return;
		}

		let path = await parseNotePattern(args['note']);

		let note = {
			title: path.title,
			parent_id: path.parent ? path.parent.id : currentFolder.id,
		};

		try {
			note = await Note.save(note);
			Note.updateGeolocation(note.id);
		} catch (error) {
			this.log(error);
		}

		end();
	},
});

commands.push({
	usage: 'use <notebook>',
	aliases: ['cd'],
	description: 'Switches to [notebook] - all further operations will happen within this notebook.',
	action: async function(args, end) {
		let folderTitle = args['notebook'];

		let folder = await Folder.loadByField('title', folderTitle);
		if (!folder) return cmdError(this, _('Invalid folder title: %s', folderTitle), end);
		switchCurrentFolder(folder);
		end();
	},
	autocomplete: autocompleteFolders,
});

commands.push({
	usage: 'set <item> <name> [value]',
	description: 'Sets the property <name> of the given <item> to the given [value].',
	action: async function(args, end) {
		try {
			let promise = null;
			let title = args['item'];
			let propName = args['name'];
			let propValue = args['value'];
			if (!propValue) propValue = '';

			let item = null;
			if (!currentFolder) {
				item = await Folder.loadByField('title', title);
			} else {
				item = await Note.loadFolderNoteByField(currentFolder.id, 'title', title);
			}

			if (!item) {
				item = await BaseItem.loadItemById(title);
			}

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
			let ItemClass = BaseItem.itemClass(newItem);
			await ItemClass.save(newItem);
		} catch(error) {
			this.log(error);
		}
		end();
	},
	autocomplete: autocompleteItems,
});

commands.push({
	usage: 'cat <title>',
	description: 'Displays the given item data.',
	action: async function(args, end) {
		try {
			let title = args['title'];

			let item = null;
			if (!currentFolder) {
				item = await Folder.loadByField('title', title);
			} else {
				item = await Note.loadFolderNoteByField(currentFolder.id, 'title', title);
			}

			if (!item) {
				this.log(_('No item with title "%s" found.', title));
				end();
				return;
			}

			let content = null;
			if (!currentFolder) {
				content = await Folder.serialize(item);
			} else {
				content = await Note.serialize(item);
			}

			this.log(content);
		} catch(error) {
			this.log(error);
		}

		end();
	},
	autocomplete: autocompleteItems,
});

commands.push({
	usage: 'edit <title>',
	description: 'Edit note.',
	action: async function(args, end) {

		let watcher = null;
		const onFinishedEditing = () => {
			if (watcher) watcher.close();
			vorpal.show();
			this.log(_('Done editing.'));
			end();
		}

		try {		
			let title = args['title'];

			if (!currentFolder) throw new Error(_('No active notebook.'));
			let note = await Note.loadFolderNoteByField(currentFolder.id, 'title', title);

			if (!note) throw new Error(_('No note with title "%s" found.', title));

			let editorPath = getTextEditorPath();
			let editorArgs = editorPath.split(' ');

			editorPath = editorArgs[0];
			editorArgs = editorArgs.splice(1);

			let content = await Note.serializeForEdit(note);

			let tempFilePath = Setting.value('profileDir') + '/tmp/' + Note.systemPath(note);
			editorArgs.push(tempFilePath);

			const spawn	= require('child_process').spawn;

			this.log(_('Starting to edit note. Close the editor to get back to the prompt.'));

			vorpal.hide();

			await fs.writeFile(tempFilePath, content);

			let watchTimeout = null;
			watcher = fs.watch(tempFilePath, (eventType, filename) => {
				// We need a timeout because for each change to the file, multiple events are generated.

				if (watchTimeout) return;

				watchTimeout = setTimeout(async () => {
					let updatedNote = await fs.readFile(tempFilePath, 'utf8');
					updatedNote = await Note.unserializeForEdit(updatedNote);
					updatedNote.id = note.id;
					await Note.save(updatedNote);
					watchTimeout = null;
				}, 200);
			});

			const childProcess = spawn(editorPath, editorArgs, { stdio: 'inherit' });
			childProcess.on('exit', (error, code) => {
				onFinishedEditing();
			});
		} catch(error) {
			this.log(error);
			onFinishedEditing();
		}
	},
	autocomplete: autocompleteItems,
});

commands.push({
	usage: 'rm <pattern>',
	description: 'Deletes the given item. For a notebook, all the notes within that notebook will be deleted. Use `rm ../<notebook>` to delete a notebook.',
	options: [
		['-f, --force', 'Deletes the items without asking for confirmation.'],
	],
	action: async function(args, end) {
		try {
			let pattern = args['pattern'];
			let itemType = null;
			let force = args.options && args.options.force === true;

			if (pattern.indexOf('*') < 0) { // Handle it as a simple title
				if (pattern.substr(0, 3) == '../') {
					itemType = BaseModel.TYPE_FOLDER;
					pattern = pattern.substr(3);
				} else {
					itemType = BaseModel.TYPE_NOTE;
				}

				let item = await BaseItem.loadItemByField(itemType, 'title', pattern);
				if (!item) throw new Error(_('No item with title "%s" found.', pattern));

				let ok = force ? true : await cmdPromptConfirm(this, _('Delete item?'));
				if (ok) {
					await BaseItem.deleteItem(itemType, item.id);
					if (currentFolder && currentFolder.id == item.id) {
						let f = await Folder.defaultFolder();
						switchCurrentFolder(f);
					}
				}
			} else { // Handle it as a glob pattern
				if (currentFolder) {
					let notes = await Note.previews(currentFolder.id, { titlePattern: pattern });
					if (!notes.length) throw new Error(_('No note matches this pattern: "%s"', pattern));
					let ok = force ? true : await cmdPromptConfirm(this, _('%d notes match this pattern. Delete them?', notes.length));
					if (ok) {
						for (let i = 0; i < notes.length; i++) {
							await Note.delete(notes[i].id);
						}
					}
				}
			}
		} catch (error) {
			this.log(error);
		}

		end();
	},
	autocomplete: autocompleteItems,
});

commands.push({
	usage: 'mv <pattern> <notebook>',
	description: 'Moves the notes matching <pattern> to <notebook>.',
	action: async function(args, end) {
		try {
			if (!currentFolder) throw new Error(_('Please select a notebook first.'));

			let pattern = args['pattern'];

			let folder = await Folder.loadByField('title', args['notebook']);
			if (!folder) throw new Error(_('No folder with title "%s"', args['notebook']));
			let notes = await Note.previews(currentFolder.id, { titlePattern: pattern });
			if (!notes.length) throw new Error(_('No note matches this pattern: "%s"', pattern));

			for (let i = 0; i < notes.length; i++) {
				await Note.save({ id: notes[i].id, parent_id: folder.id });
			}
		} catch (error) {
			this.log(error);
		}

		end();
	},
	autocomplete: autocompleteItems,
});

commands.push({
	usage: 'tag <command> [tag] [note]',
	description: '<command> can be "add", "remove" or "list" to assign or remove [tag] from [note], or to list the notes associated with [tag]. The command `tag list` can be used to list all the tags.',
	action: async function(args, end) {
		try {
			let tag = null;
			if (args.tag) tag = await loadItem(BaseModel.TYPE_TAG, args.tag);
			let note = null;
			if (args.note) note = await loadItem(BaseModel.TYPE_NOTE, args.note);

			if (args.command == 'remove' && !tag) throw new Error(_('Tag does not exist: "%s"', args.tag));

			if (args.command == 'add') {
				if (!note) throw new Error(_('Note does not exist: "%s"', args.note));
				if (!tag) tag = await Tag.save({ title: args.tag });
				await Tag.addNote(tag.id, note.id);
			} else if (args.command == 'remove') {
				if (!tag) throw new Error(_('Tag does not exist: "%s"', args.tag));
				if (!note) throw new Error(_('Note does not exist: "%s"', args.note));
				await Tag.removeNote(tag.id, note.id);
			} else if (args.command == 'list') {
				if (tag) {
					let notes = await Tag.notes(tag.id);
					notes.map((note) => { this.log(note.title); });
				} else {
					let tags = await Tag.all();
					tags.map((tag) => { this.log(tag.title); });
				}
			} else {
				throw new Error(_('Invalid command: "%s"', args.command));
			}
		} catch (error) {
			this.log(error);
		}

		end();
	}
});

commands.push({
	usage: 'dump',
	description: 'Dumps the complete database as JSON.',
	action: async function(args, end) {
		try {
			let items = [];
			let folders = await Folder.all();
			for (let i = 0; i < folders.length; i++) {
				let folder = folders[i];
				let notes = await Note.previews(folder.id);
				items.push(folder);
				items = items.concat(notes);
			}

			let tags = await Tag.all();
			for (let i = 0; i < tags.length; i++) {
				tags[i].notes_ = await Tag.tagNoteIds(tags[i].id);
			}

			items = items.concat(tags);
			
			this.log(JSON.stringify(items));
		} catch (error) {
			this.log(error);
		}

		end();
	}
});

commands.push({
	usage: 'ls [pattern]',
	description: 'Displays the notes in [notebook]. Use `ls ..` to display the list of notebooks.',
	options: [
		['-n, --lines <num>', 'Displays only the first top <num> lines.'],
		['-s, --sort <field>', 'Sorts the item by <field> (eg. title, updated_time, created_time).'],
		['-r, --reverse', 'Reverses the sorting order.'],
		['-t, --type <type>', 'Displays only the items of the specific type(s). Can be `n` for notes, `t` for todos, or `nt` for notes and todos (eg. `-tt` would display only the todos, while `-ttd` would display notes and todos.'],
		['-f, --format <format>', 'Either "text" or "json"'],
	],
	action: async function(args, end) {
		try {
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

			if (pattern == '..' || !currentFolder) {
				items = await Folder.all(queryOptions);
				suffix = '/';
			} else {
				if (!currentFolder) throw new Error(_('Please select a notebook first.'));
				items = await Note.previews(currentFolder.id, queryOptions);
			}

			if (options.format && options.format == 'json') {
				this.log(JSON.stringify(items));
			} else {
				for (let i = 0; i < items.length; i++) {
					let item = items[i];
					let line = '';
					if (!!item.is_todo) {
						line += sprintf('[%s] ', !!item.todo_completed ? 'X' : ' ');
					}
					line += item.title + suffix;
					this.log(line);
				}
			}
		} catch (error) {
			this.log(error);
		}

		end();
	},
	autocomplete: autocompleteFolders,
});

commands.push({
	usage: 'config [name] [value]',
	description: 'Gets or sets a config value. If [value] is not provided, it will show the value of [name]. If neither [name] nor [value] is provided, it will list the current configuration.',
	action: async function(args, end) {
		try {
			if (!args.name && !args.value) {
				let keys = Setting.publicKeys();
				for (let i = 0; i < keys.length; i++) {
					this.log(keys[i] + ' = ' + Setting.value(keys[i]));
				}
			} else if (args.name && !args.value) {
				this.log(args.name + ' = ' + Setting.value(args.name));
			} else {
				Setting.setValue(args.name, args.value);
				await Setting.saveAll();
			}
		} catch(error) {
			this.log(error);
		}
		end();
	},
});

commands.push({
	usage: 'sync',
	description: 'Synchronizes with remote storage.',
	options: [
		['--random-failures', 'For debugging purposes. Do not use.'],
		['--stats', 'Displays stats about synchronization.'],
	],
	action: async function(args, end) {

		if (args.options.stats) {
			const report = await BaseItem.stats();
			for (let n in report.items) {
				if (!report.items.hasOwnProperty(n)) continue;
				const r = report.items[n];
				this.log(_('%s: %d/%d', n, r.synced, r.total))
			}
			this.log(_('Total: %d/%d', report.total.synced, report.total.total));
		} else {
			let options = {
				onProgress: (report) => {
					let line = [];
					if (report.remotesToUpdate) line.push(_('Items to upload: %d/%d.', report.createRemote + report.updateRemote, report.remotesToUpdate));
					if (report.remotesToDelete) line.push(_('Remote items to delete: %d/%d.', report.deleteRemote, report.remotesToDelete));
					if (report.localsToUdpate) line.push(_('Items to download: %d/%d.', report.createLocal + report.updateLocal, report.localsToUdpate));
					if (report.localsToDelete) line.push(_('Local items to delete: %d/%d.', report.deleteLocal, report.localsToDelete));
					if (line.length) vorpalUtils.redraw(line.join(' '));
				},
				onMessage: (msg) => {
					vorpalUtils.redrawDone();
					this.log(msg);
				},
				randomFailures: args.options['random-failures'] === true,
			};

			this.log(_('Synchronization target: %s', Setting.value('sync.target')));

			let sync = await synchronizer(Setting.value('sync.target'));
			if (!sync) {
				end();
				return;
			}

			try {
				this.log(_('Starting synchronization...'));
				await sync.start(options);
			} catch (error) {
				this.log(error);
			}

			vorpalUtils.redrawDone();
			this.log(_('Done.'));
		}

		end();
	},
	cancel: async function() {
		vorpalUtils.redrawDone();
		this.log(_('Cancelling...'));
		let sync = await synchronizer(Setting.value('sync.target'));
		sync.cancel();
	},
});

commands.push({
	usage: 'import-enex <file> [notebook]',
	description: _('Imports an Evernote notebook file (.enex file).'),
	options: [
		['--fuzzy-matching', 'For debugging purposes. Do not use.'],
	],
	action: async function(args, end) {
		try {
			let filePath = args.file;
			let folder = null;
			let folderTitle = args['notebook'];

			if (folderTitle) {
				folder = await Folder.loadByField('title', folderTitle);
				if (!folder) {
					let ok = await cmdPromptConfirm(this, _('Folder does not exists: "%s". Create it?', folderTitle))
					if (!ok) {
						end();
						return;
					}

					folder = await Folder.save({ title: folderTitle });
				}
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
				onProgress: (progressState) => {
					let line = [];
					line.push(_('Found: %d.', progressState.loaded));
					line.push(_('Created: %d.', progressState.created));
					if (progressState.updated) line.push(_('Updated: %d.', progressState.updated));
					if (progressState.skipped) line.push(_('Skipped: %d.', progressState.skipped));
					if (progressState.resourcesCreated) line.push(_('Resources: %d.', progressState.resourcesCreated));
					if (progressState.notesTagged) line.push(_('Tagged: %d.', progressState.notesTagged));
					vorpalUtils.redraw(line.join(' '));
				},
				onError: (error) => {
					vorpalUtils.redrawDone();
					let s = error.trace ? error.trace : error.toString();
					this.log(s);
				},
			}

			folder = !folder ? await Folder.save({ title: folderTitle }) : folder;
			this.log(_('Importing notes...'));
			await importEnex(folder.id, filePath, options);
		} catch (error) {
			this.log(error);
		}

		vorpalUtils.redrawDone();

		end();			
	},
});

async function parseNotePattern(pattern) {
	if (pattern.indexOf('..') === 0) {
		let pieces = pattern.split('/');
		if (pieces.length != 3) throw new Error(_('Invalid pattern: %s', pattern));
		let parent = await loadItem(BaseModel.TYPE_FOLDER, pieces[1]);		
		if (!parent) throw new Error(_('Notebook not found: %s', pieces[1]));
		return {
			parent: parent,
			title: pieces[2],
		};
	} else {
		return {
			parent: null,
			title: pattern,
		};
	}
}

async function loadItem(type, pattern) {
	let output = await loadItems(type, pattern);
	return output.length ? output[0] : null;
}

async function loadItems(type, pattern) {
	let ItemClass = BaseItem.itemClass(type);
	let item = await ItemClass.loadByTitle(pattern);
	if (item) return [item];
	item = await ItemClass.load(pattern);
	return [item];
}

function commandByName(name) {
	for (let i = 0; i < commands.length; i++) {
		let c = commands[i];
		let n = c.usage.split(' ');
		n = n[0].trim();
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

async function synchronizer(syncTarget) {
	if (synchronizers_[syncTarget]) return synchronizers_[syncTarget];

	let fileApi = null;

	if (syncTarget == 'onedrive') {
		const oneDriveApi = reg.oneDriveApi();
		let driver = new FileApiDriverOneDrive(oneDriveApi);
		let auth = Setting.value('sync.onedrive.auth');

		if (!oneDriveApi.auth()) {
			const oneDriveApiUtils = new OneDriveApiNodeUtils(oneDriveApi);
			auth = await oneDriveApiUtils.oauthDance(vorpal);
			Setting.setValue('sync.onedrive.auth', auth ? JSON.stringify(auth) : auth);
			if (!auth) return;
		}

		let appDir = await oneDriveApi.appDirectory();
		logger.info('App dir: ' + appDir);
		fileApi = new FileApi(appDir, driver);
		fileApi.setLogger(logger);
	} else if (syncTarget == 'memory') {
		fileApi = new FileApi('joplin', new FileApiDriverMemory());
		fileApi.setLogger(logger);
	} else if (syncTarget == 'local') {
		let syncDir = Setting.value('sync.local.path');
		if (!syncDir) syncDir = Setting.value('profileDir') + '/sync';
		vorpal.log(_('Synchronizing with directory "%s"', syncDir));
		await fs.mkdirp(syncDir, 0o755);
		fileApi = new FileApi(syncDir, new FileApiDriverLocal());
		fileApi.setLogger(logger);
	} else {
		throw new Error('Unknown backend: ' + syncTarget);
	}

	synchronizers_[syncTarget] = new Synchronizer(database_, fileApi, Setting.value('appType'));
	synchronizers_[syncTarget].setLogger(syncLogger);

	return synchronizers_[syncTarget];
}

function switchCurrentFolder(folder) {
	currentFolder = folder;
	Setting.setValue('activeFolderId', folder ? folder.id : '');
	updatePrompt();
}

function promptString() {
	if (!showPromptString) return '';

	let path = '~';
	if (currentFolder) {
		path += '/' + currentFolder.title;
	}
	return Setting.value('appName') + ':' + path + '$ ';
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

// Handles the initial flags passed to main script and
// returns the remaining args.
async function handleStartFlags(argv) {
	argv = argv.slice(0);
	argv.splice(0, 2); // First arguments are the node executable, and the node JS file

	while (argv.length) {
		let arg = argv[0];
		let nextArg = argv.length >= 2 ? argv[1] : null;
		
		if (arg == '--profile') {
			if (!nextArg) throw new Error(_('Usage: --profile <dir-path>'));
			initArgs.profileDir = nextArg;
			argv.splice(0, 2);
			continue;
		}

		if (arg == '--env') {
			if (!nextArg) throw new Error(_('Usage: --env <dev|prod>'));
			initArgs.env = nextArg;
			argv.splice(0, 2);
			continue;
		}

		if (arg == '--redraw-disabled') {
			vorpalUtils.setRedrawEnabled(false);
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
			logLevel = Logger.levelStringToId(nextArg);
			argv.splice(0, 2);
			continue;
		}

		if (arg.length && arg[0] == '-') {
			throw new Error(_('Unknown flag: %s', arg));
		} else {
			break;
		}
	}

	return argv;
}

function escapeShellArg(arg) {
	if (arg.indexOf('"') >= 0 && arg.indexOf("'") >= 0) throw new Error(_('Command line argument "%s" contains both quotes and double-quotes - aborting.', arg)); // Hopeless case
	let quote = '"';
	if (arg.indexOf('"') >= 0) quote = "'";
	if (arg.indexOf(' ') >= 0 || arg.indexOf("\t") >= 0) return quote + arg + quote;
	return arg;
}

function shellArgsToString(args) {
	let output = [];
	for (let i = 0; i < args.length; i++) {
		output.push(escapeShellArg(args[i]));
	}
	return output.join(' ');
}

function getTextEditorPath() {
	if (Setting.value('editor')) return Setting.value('editor');
	if (process.env.EDITOR) return process.env.EDITOR;
	throw new Error(_('No text editor is defined. Please set it using `config editor <editor-path>`'));
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

const vorpal = require('vorpal')();

vorpalUtils.initialize(vorpal);

async function main() {

	shimInit();

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

		if (c.cancel) {
			o.cancel(c.cancel);
		}

		o.action(c.action);
	}

	let argv = process.argv;
	argv = await handleStartFlags(argv);
	if (argv.length) showPromptString = false;

	const profileDir = initArgs.profileDir ? initArgs.profileDir : os.homedir() + '/.config/' + Setting.value('appName');
	const resourceDir = profileDir + '/resources';

	Setting.setConstant('env', initArgs.env);
	Setting.setConstant('profileDir', profileDir);
	Setting.setConstant('resourceDir', resourceDir);

	await fs.mkdirp(profileDir, 0o755);
	await fs.mkdirp(resourceDir, 0o755);

	logger.addTarget('file', { path: profileDir + '/log.txt' });
	logger.setLevel(logLevel);

	reg.setLogger(logger);

	dbLogger.addTarget('file', { path: profileDir + '/log-database.txt' });
	dbLogger.setLevel(logLevel);

	syncLogger.addTarget('file', { path: profileDir + '/log-sync.txt' });
	syncLogger.setLevel(logLevel);

	logger.info(sprintf('Starting %s %s (%s)...', packageJson.name, packageJson.version, Setting.value('env')));
	logger.info('Profile directory: ' + profileDir);

	// That's not good, but it's to avoid circular dependency issues
	// in the BaseItem class.
	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Resource', Resource);
	BaseItem.loadClass('Tag', Tag);
	BaseItem.loadClass('NoteTag', NoteTag);

	database_ = new JoplinDatabase(new DatabaseDriverNode());
	database_.setLogger(dbLogger);
	await database_.open({ name: profileDir + '/database.sqlite' });
	BaseModel.db_ = database_;
	await Setting.load();

	let activeFolderId = Setting.value('activeFolderId');
	let activeFolder = null;
	if (activeFolderId) activeFolder = await Folder.load(activeFolderId);
	if (!activeFolder) activeFolder = await Folder.defaultFolder();
	Setting.setValue('activeFolderId', activeFolder ? activeFolder.id : '');

	if (activeFolder) await execCommand('cd', { 'notebook': activeFolder.title }); // Use execCommand() so that no history entry is created

	// If we still have arguments, pass it to Vorpal and exit
	if (argv.length) {
		let cmd = shellArgsToString(argv);
		await vorpal.exec(cmd);
		await vorpal.exec('exit');
		return;
	} else {
		vorpal.delimiter(promptString());
		vorpal.show();
		vorpal.history(Setting.value('appId')); // Enables persistent history
		if (!activeFolder) {
			vorpal.log(_('No notebook is defined. Create one with `mkbook <notebook>`.'));
		}
	}
}

main().catch((error) => {
	vorpal.log('Fatal error:');
	vorpal.log(error);
});