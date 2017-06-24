require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { FileApi } from 'lib/file-api.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { Database } from 'lib/database.js';
import { DatabaseDriverNode } from 'lib/database-driver-node.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { Logger } from 'lib/logger.js';
import { uuid } from 'lib/uuid.js';
import { sprintf } from 'sprintf-js';
import { importEnex } from 'import-enex';
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




	console.info('DELETING ALL DATA');
	await db.exec('DELETE FROM notes');
	await db.exec('DELETE FROM changes');
	await db.exec('DELETE FROM folders WHERE is_default != 1');
	await db.exec('DELETE FROM resources');
	await db.exec('DELETE FROM deleted_items');
	await db.exec('DELETE FROM tags');
	await db.exec('DELETE FROM note_tags');
	let folder = await Folder.save({ title: 'test' });



	//let folder = await Folder.loadByField('title', 'test');
	await importEnex(folder.id, '/mnt/c/Users/Laurent/Desktop/afaire.enex');
	return;





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
		currentFolder = folder;
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
		usage: 'cd <list-title>',
		description: 'Moved to [list-title] - all further operations will happen within this list. Use `cd ..` to go back one level.',
		action: function (args, end) {
			let folderTitle = args['list-title'];

			if (folderTitle == '..') {
				switchCurrentFolder(null);
				end();
				return;
			}

			if (folderTitle == '.') {
				end();
				return;
			}

			Folder.loadByField('title', folderTitle).then((folder) => {
				switchCurrentFolder(folder);
				end();
			});
		},
		autocomplete: autocompleteFolders,
	});

	commands.push({
		usage: 'mklist <list-title>',
		alias: 'mkdir',
		description: 'Creates a new list',
		action: function (args, end) {
			Folder.save({ title: args['list-title'] }).catch((error) => {
				this.log(error);
			}).then((folder) => {
				switchCurrentFolder(folder);
				end();
			});
		},
	});

	commands.push({
		usage: 'mknote <note-title>',
		alias: 'touch',
		description: 'Creates a new note',
		action: function (args, end) {
			if (!currentFolder) {
				this.log('Notes can only be created within a list.');
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
		usage: 'set <item-title> <prop-name> [prop-value]',
		description: 'Sets the given <prop-name> of the given item.',
		action: function (args, end) {
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
		action: function (args, end) {
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
		usage: 'rm <item-title>',
		description: 'Deletes the given item. For a list, all the notes within that list will be deleted.',
		action: function (args, end) {
			let title = args['item-title'];

			let promise = null;
			let itemType = currentFolder ? 'note' : 'folder';
			if (itemType == 'folder') {
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

				if (itemType == 'folder') {
					return Folder.delete(item.id);
				} else {
					return Note.delete(item.id);
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
		usage: 'ls [list-title]',
		alias: 'll',
		description: 'Lists items in [list-title].',
		action: function (args, end) {
			let folderTitle = args['list-title'];

			let promise = null;

			if (folderTitle == '..') {
				promise = Promise.resolve('root');
			} else if (folderTitle && folderTitle != '.') {
				promise = Folder.loadByField('title', folderTitle);
			} else if (currentFolder) {
				promise = Promise.resolve(currentFolder);
			} else {
				promise = Promise.resolve('root');
			}

			promise.then((folder) => {
				let p = null
				let postfix = '';
				if (folder === 'root') {
					p = Folder.all();
					postfix = '/';
				} else if (!folder) {
					throw new Error(_('Unknown list: "%s"', folderTitle));
				} else {
					p = Note.previews(folder.id);
				}

				return p.then((previews) => {
					for (let i = 0; i < previews.length; i++) {
						this.log(previews[i].title + postfix);
					}
				});
			}).catch((error) => {
				this.log(error);
			}).then(() => {
				end();
			});
		},
		autocomplete: autocompleteFolders,
	});

	commands.push({
		usage: 'sync',
		description: 'Synchronizes with remote storage.',
		action: function (args, end) {
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
		usage: 'import-enex',
		description: _('Imports a .enex file (Evernote export file).'),
		action: function (args, end) {
			
			end();
		},
	});

	for (let i = 0; i < commands.length; i++) {
		let c = commands[i];
		let o = vorpal.command(c.usage, c.description);
		if (c.alias) {
			o.alias(c.alias);
		}
		if (c.autocomplete) {
			o.autocomplete({
				data: c.autocomplete,
			});
		}
		o.action(c.action);
	}

	vorpal.delimiter(promptString()).show();
}

main().catch((error) => {
	console.error('Fatal error: ', error);
});