import { FileApi } from 'src/file-api.js';
import { FileApiDriverLocal } from 'src/file-api-driver-local.js';
import { Database } from 'src/database.js';
import { DatabaseDriverNode } from 'src/database-driver-node.js';
import { BaseModel } from 'src/base-model.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { Synchronizer } from 'src/synchronizer.js';
import { uuid } from 'src/uuid.js';
import { sprintf } from 'sprintf-js';
import { _ } from 'src/locale.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';


// name: 'f42b0e23f06948ee9dda3fcf1b1c4205/.folder.md',
// createdTime: 1497216952,
// updatedTime: 1497216952,
// createdTimeOrig: 2017-06-11T21:35:52.362Z,
// updatedTimeOrig: 2017-06-11T21:35:52.362Z,
// isDir: false

// Sun, 11 Jun 2017 21:35:52 GMT


// import moment from 'moment';

// let m = moment('2017-06-11T21:35:52.362Z');
// console.info(Math.round(m.toDate().getTime() / 1000));

// //let m = moment(time, 'YYYY-MM-DDTHH:mm:ss.SSSZ');

// // if (!m.isValid()) {
// // 	throw new Error('Invalid date: ' + time);
// // }
// // return Math.round(m.toDate().getTime() / 1000);



const vorpal = require('vorpal')();

let db = new Database(new DatabaseDriverNode());
db.setDebugEnabled(false);

let fileDriver = new FileApiDriverLocal();
let fileApi = new FileApi('/home/laurent/Temp/TestImport', fileDriver);
let synchronizer = new Synchronizer(db, fileApi);

db.open({ name: '/home/laurent/Temp/test.sqlite3' }).then(() => {
	BaseModel.db_ = db;

	let commands = [];
	let currentFolder = null;

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

	process.stdin.on('keypress', (_, key) => {
		if (key && key.name === 'return') {
			updatePrompt();
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
	});

	commands.push({
		usage: 'mklist <list-title>',
		description: 'Creates a new list',
		action: function (args, end) {
			NoteFolderService.save('folder', { title: args['list-title'] }).catch((error) => {
				this.log(error);
			}).then((folder) => {
				switchCurrentFolder(folder);
				end();
			});
		},
	});

	commands.push({
		usage: 'mknote <note-title>',
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
			NoteFolderService.save('note', note).catch((error) => {
				this.log(error);
			}).then((note) => {
				end();
			});
		},
	});

	commands.push({
		usage: 'edit <item-title> <prop-name> [prop-value]',
		description: 'Sets the given <prop-name> of the given item.',
		action: function (args, end) {
			let promise = null;
			let title = args['item-title'];
			let propName = args['prop-name'];
			let propValue = args['prop-value'];

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

				let newItem = Object.assign({}, item);
				newItem[propName] = propValue;
				let itemType = currentFolder ? 'note' : 'folder';
				return NoteFolderService.save(itemType, newItem, item);
			}).catch((error) => {
				this.log(error);
			}).then(() => {
				end();
			});
		},
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
					this.log(Folder.toFriendlyString(item));
				} else {
					this.log(Note.toFriendlyString(item));
				}
			}).catch((error) => {
				this.log(error);
			}).then(() => {
				end();
			});
		},
	});

	commands.push({
		usage: 'ls [list-title]',
		description: 'Lists items in [list-title].',
		action: function (args, end) {
			let folderTitle = args['list-title'];

			let promise = null;

			if (folderTitle) {
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
	});

	commands.push({
		usage: 'sync',
		description: 'Synchronizes with remote storage.',
		action: function (args, end) {
			synchronizer.start().catch((error) => {
				console.error(error);
			}).then(() => {
				end();
			});
		},
	});

	for (let i = 0; i < commands.length; i++) {
		let c = commands[i];
		let o = vorpal.command(c.usage, c.description);
		o.action(c.action);
	}

	vorpal.delimiter(promptString()).show();
});