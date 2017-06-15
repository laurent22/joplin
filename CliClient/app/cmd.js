require('source-map-support').install();

import { FileApi } from 'src/file-api.js';
import { FileApiDriverLocal } from 'src/file-api-driver-local.js';
import { FileApiDriverMemory } from 'src/file-api-driver-memory.js';
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
import { NoteFolderService } from 'src/services/note-folder-service.js';


let db = new Database(new DatabaseDriverNode());
let fileDriver = new FileApiDriverLocal();
let fileApi = new FileApi('/home/laurent/Temp/TestImport', fileDriver);
let synchronizer = new Synchronizer(db, fileApi);

function clearDatabase() {
	let queries = [
		'DELETE FROM changes',
		'DELETE FROM notes',
		'DELETE FROM folders',
		'DELETE FROM item_sync_times',
	];

	return db.transactionExecBatch(queries);
}

function createRemoteItems() {
	let a = fileApi;
	return Promise.all([a.mkdir('test1'), a.mkdir('test2'), a.mkdir('test3')]).then(() => {
		return Promise.all([
			a.put('test1/un', 'test1_un'),
			a.put('test1/deux', 'test1_deux'),
			a.put('test2/trois', 'test2_trois'),
			a.put('test3/quatre', 'test3_quatre'),
			a.put('test3/cinq', 'test3_cinq'),
			a.put('test3/six', 'test3_six'),
		]);
	});
}

function createLocalItems() {
	return Folder.save({ title: "folder1" }).then((f) => {
		return Promise.all([
			Note.save({ title: "un", parent_id: f.id }),
			Note.save({ title: "deux", parent_id: f.id }),
			Note.save({ title: "trois", parent_id: f.id }),
			Note.save({ title: "quatre", parent_id: f.id }),
		]);
	}).then(() => {
		return Folder.save({ title: "folder2" })
	}).then((f) => {
		return Promise.all([
			Note.save({ title: "cinq", parent_id: f.id }),
		]);
	}).then(() => {
		return Folder.save({ title: "folder3" })
	}).then(() => {
		return Folder.save({ title: "folder4" })
	}).then((f) => {
		return Promise.all([
			Note.save({ title: "six", parent_id: f.id }),
			Note.save({ title: "sept", parent_id: f.id }),
			Note.save({ title: "huit", parent_id: f.id }),
		]);
	});
}

db.setDebugEnabled(true);
db.open({ name: '/home/laurent/Temp/test-sync.sqlite3' }).then(() => {
 	BaseModel.db_ = db;
 	//return clearDatabase();
 	//return clearDatabase().then(createLocalItems);
}).then(() => {
	return synchronizer.start();
}).catch((error) => {
	console.error(error);
});

























// let fileDriver = new FileApiDriverMemory();
// let fileApi = new FileApi('/root', fileDriver);
// let synchronizer = new Synchronizer(db, fileApi);












































// import { ItemSyncTime } from 'src/models/item-sync-time.js';

// const vorpal = require('vorpal')();

// let db = new Database(new DatabaseDriverNode());
// db.setDebugEnabled(false);
// db.open({ name: '/home/laurent/Temp/test.sqlite3' }).then(() => {
// 	BaseModel.db_ = db;

// 	return ItemSyncTime.setTime(123, 789);

// }).then((r) => {
// 	console.info(r);
// }).catch((error) => {
// 	console.error(error);
// });

// // let fileDriver = new FileApiDriverLocal();
// // let fileApi = new FileApi('/home/laurent/Temp/TestImport', fileDriver);
// // let synchronizer = new Synchronizer(db, fileApi);


// let fileDriver = new FileApiDriverMemory();
// let fileApi = new FileApi('/root', fileDriver);
// let synchronizer = new Synchronizer(db, fileApi);


// fileApi.mkdir('test').then(() => {
// 	return fileApi.mkdir('test2');
// }).then(() => {
// 	return fileApi.put('test/un', 'abcd1111').then(fileApi.put('test/deux', 'abcd2222'));
// }).then(() => {
// 	return fileApi.list();
// }).then((items) => {
// 	//console.info(items);
// }).then(() => {
// 	return fileApi.delete('test/un');
// }).then(() => {
// 	return fileApi.get('test/deux').then((content) => { console.info(content); });
// }).then(() => {
// 	return fileApi.list('test', true);
// }).then((items) => {
// 	console.info(items);
// }).catch((error) => {
// 	console.error(error);
// }).then(() => {
// 	process.exit();
// });







// db.open({ name: '/home/laurent/Temp/test.sqlite3' }).then(() => {
// 	BaseModel.db_ = db;
// }).then(() => {
// 	return Setting.load();
// }).then(() => {
// 	let commands = [];
// 	let currentFolder = null;

// 	function switchCurrentFolder(folder) {
// 		currentFolder = folder;
// 		updatePrompt();
// 	}

// 	function promptString() {
// 		let path = '~';
// 		if (currentFolder) {
// 			path += '/' + currentFolder.title;
// 		}
// 		return 'joplin:' + path + '$ ';
// 	}

// 	function updatePrompt() {
// 		vorpal.delimiter(promptString());
// 	}

// 	// For now, to go around this issue: https://github.com/dthree/vorpal/issues/114
// 	function quotePromptArg(s) {
// 		if (s.indexOf(' ') >= 0) {
// 			return '"' + s + '"';
// 		}
// 		return s;
// 	}

// 	function autocompleteFolders() {
// 		return Folder.all().then((folders) => {
// 			let output = [];
// 			for (let i = 0; i < folders.length; i++) {
// 				output.push(quotePromptArg(folders[i].title));
// 			}
// 			output.push('..');
// 			output.push('.');
// 			return output;
// 		});
// 	}

// 	function autocompleteItems() {
// 		let promise = null;
// 		if (!currentFolder) {
// 			promise = Folder.all();
// 		} else {
// 			promise = Note.previews(currentFolder.id);
// 		}

// 		return promise.then((items) => {
// 			let output = [];
// 			for (let i = 0; i < items.length; i++) {
// 				output.push(quotePromptArg(items[i].title));
// 			}
// 			return output;			
// 		});
// 	}

// 	process.stdin.on('keypress', (_, key) => {
// 		if (key && key.name === 'return') {
// 			updatePrompt();
// 		}

// 		if (key.name === 'tab') {
// 			vorpal.ui.imprint();
// 			vorpal.log(vorpal.ui.input());
// 		}
// 	});

// 	commands.push({
// 		usage: 'cd <list-title>',
// 		description: 'Moved to [list-title] - all further operations will happen within this list. Use `cd ..` to go back one level.',
// 		action: function (args, end) {
// 			let folderTitle = args['list-title'];

// 			if (folderTitle == '..') {
// 				switchCurrentFolder(null);
// 				end();
// 				return;
// 			}

// 			if (folderTitle == '.') {
// 				end();
// 				return;
// 			}

// 			Folder.loadByField('title', folderTitle).then((folder) => {
// 				switchCurrentFolder(folder);
// 				end();
// 			});
// 		},
// 		autocomplete: autocompleteFolders,
// 	});

// 	commands.push({
// 		usage: 'mklist <list-title>',
// 		alias: 'mkdir',
// 		description: 'Creates a new list',
// 		action: function (args, end) {
// 			NoteFolderService.save('folder', { title: args['list-title'] }).catch((error) => {
// 				this.log(error);
// 			}).then((folder) => {
// 				switchCurrentFolder(folder);
// 				end();
// 			});
// 		},
// 	});

// 	commands.push({
// 		usage: 'mknote <note-title>',
// 		alias: 'touch',
// 		description: 'Creates a new note',
// 		action: function (args, end) {
// 			if (!currentFolder) {
// 				this.log('Notes can only be created within a list.');
// 				end();
// 				return;
// 			}

// 			let note = {
// 				title: args['note-title'],
// 				parent_id: currentFolder.id,
// 			};
// 			NoteFolderService.save('note', note).catch((error) => {
// 				this.log(error);
// 			}).then((note) => {
// 				end();
// 			});
// 		},
// 	});

// 	commands.push({
// 		usage: 'set <item-title> <prop-name> [prop-value]',
// 		description: 'Sets the given <prop-name> of the given item.',
// 		action: function (args, end) {
// 			let promise = null;
// 			let title = args['item-title'];
// 			let propName = args['prop-name'];
// 			let propValue = args['prop-value'];
// 			if (!propValue) propValue = '';

// 			if (!currentFolder) {
// 				promise = Folder.loadByField('title', title);
// 			} else {
// 				promise = Folder.loadNoteByField(currentFolder.id, 'title', title);
// 			}

// 			promise.then((item) => {
// 				if (!item) {
// 					this.log(_('No item with title "%s" found.', title));
// 					end();
// 					return;
// 				}

// 				let newItem = Object.assign({}, item);
// 				newItem[propName] = propValue;
// 				let itemType = currentFolder ? 'note' : 'folder';
// 				return NoteFolderService.save(itemType, newItem, item);
// 			}).catch((error) => {
// 				this.log(error);
// 			}).then(() => {
// 				end();
// 			});
// 		},
// 		autocomplete: autocompleteItems,
// 	});

// 	commands.push({
// 		usage: 'cat <item-title>',
// 		description: 'Displays the given item data.',
// 		action: function (args, end) {
// 			let title = args['item-title'];

// 			let promise = null;
// 			if (!currentFolder) {
// 				promise = Folder.loadByField('title', title);
// 			} else {
// 				promise = Folder.loadNoteByField(currentFolder.id, 'title', title);
// 			}

// 			promise.then((item) => {
// 				if (!item) {
// 					this.log(_('No item with title "%s" found.', title));
// 					end();
// 					return;
// 				}

// 				if (!currentFolder) {
// 					this.log(Folder.toFriendlyString(item));
// 				} else {
// 					this.log(Note.toFriendlyString(item));
// 				}
// 			}).catch((error) => {
// 				this.log(error);
// 			}).then(() => {
// 				end();
// 			});
// 		},
// 		autocomplete: autocompleteItems,
// 	});

// 	commands.push({
// 		usage: 'rm <item-title>',
// 		description: 'Deletes the given item. For a list, all the notes within that list will be deleted.',
// 		action: function (args, end) {
// 			let title = args['item-title'];

// 			let promise = null;
// 			let itemType = currentFolder ? 'note' : 'folder';
// 			if (itemType == 'folder') {
// 				promise = Folder.loadByField('title', title);
// 			} else {
// 				promise = Folder.loadNoteByField(currentFolder.id, 'title', title);
// 			}

// 			promise.then((item) => {
// 				if (!item) {
// 					this.log(_('No item with title "%s" found.', title));
// 					end();
// 					return;
// 				}

// 				if (itemType == 'folder') {
// 					return Folder.delete(item.id);
// 				} else {
// 					return Note.delete(item.id);
// 				}
// 			}).catch((error) => {
// 				this.log(error);
// 			}).then(() => {
// 				end();
// 			});
// 		},
// 		autocomplete: autocompleteItems,
// 	});

// 	commands.push({
// 		usage: 'ls [list-title]',
// 		alias: 'll',
// 		description: 'Lists items in [list-title].',
// 		action: function (args, end) {
// 			let folderTitle = args['list-title'];

// 			let promise = null;

// 			if (folderTitle == '..') {
// 				promise = Promise.resolve('root');
// 			} else if (folderTitle && folderTitle != '.') {
// 				promise = Folder.loadByField('title', folderTitle);
// 			} else if (currentFolder) {
// 				promise = Promise.resolve(currentFolder);
// 			} else {
// 				promise = Promise.resolve('root');
// 			}

// 			promise.then((folder) => {
// 				let p = null
// 				let postfix = '';
// 				if (folder === 'root') {
// 					p = Folder.all();
// 					postfix = '/';
// 				} else if (!folder) {
// 					throw new Error(_('Unknown list: "%s"', folderTitle));
// 				} else {
// 					p = Note.previews(folder.id);
// 				}

// 				return p.then((previews) => {
// 					for (let i = 0; i < previews.length; i++) {
// 						this.log(previews[i].title + postfix);
// 					}
// 				});
// 			}).catch((error) => {
// 				this.log(error);
// 			}).then(() => {
// 				end();
// 			});
// 		},
// 		autocomplete: autocompleteFolders,
// 	});

// 	commands.push({
// 		usage: 'sync',
// 		description: 'Synchronizes with remote storage.',
// 		action: function (args, end) {
// 			synchronizer.start().catch((error) => {
// 				console.error(error);
// 			}).then(() => {
// 				end();
// 			});
// 		},
// 	});

// 	for (let i = 0; i < commands.length; i++) {
// 		let c = commands[i];
// 		let o = vorpal.command(c.usage, c.description);
// 		if (c.alias) {
// 			o.alias(c.alias);
// 		}
// 		if (c.autocomplete) {
// 			o.autocomplete({
// 				data: c.autocomplete,
// 			});
// 		}
// 		o.action(c.action);
// 	}

// 	vorpal.delimiter(promptString()).show();
// });