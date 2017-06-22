require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { FileApi } from 'src/file-api.js';
import { FileApiDriverOneDrive } from 'src/file-api-driver-onedrive.js';
import { Database } from 'src/database.js';
import { DatabaseDriverNode } from 'src/database-driver-node.js';
import { BaseModel } from 'src/base-model.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { Setting } from 'src/models/setting.js';
import { Synchronizer } from 'src/synchronizer.js';
import { uuid } from 'src/uuid.js';
import { sprintf } from 'sprintf-js';
import { _ } from 'src/locale.js';
import os from 'os';
import fs from 'fs-extra';


let db = new Database(new DatabaseDriverNode());
let synchronizer_ = null;
const vorpal = require('vorpal')();
const APPNAME = 'joplin';

async function main() {
	let dataDir = os.homedir() + '/.local/share/' + APPNAME;
	await fs.mkdirp(dataDir, 0o755);

	await db.open({ name: dataDir + '/database.sqlite' });
	BaseModel.db_ = db;
	await Setting.load();

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

			let appDir = await driver.api().appDirectory();
			fileApi = new FileApi(appDir, driver);
		} else {
			throw new Error('Unknown backend: ' . remoteBackend);
		}

		synchronizer_ = new Synchronizer(db, fileApi);

		return synchronizer_;
	}

	let s = await synchronizer();
	return;

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
				console.error(error);
			}).then(() => {
				end();
			});
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