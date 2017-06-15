require('babel-plugin-transform-runtime');

import { Log } from 'src/log.js';
import { Setting } from 'src/models/setting.js';
import { Change } from 'src/models/change.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { BaseItem } from 'src/models/base-item.js';
import { BaseModel } from 'src/base-model.js';
import { promiseChain } from 'src/promise-utils.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';
import { time } from 'src/time-utils.js';
//import { promiseWhile } from 'src/promise-utils.js';
import moment from 'moment';

const fs = require('fs');
const path = require('path');

class Synchronizer {

	constructor(db, api) {
		this.state_ = 'idle';
		this.db_ = db;
		this.api_ = api;
	}

	state() {
		return this.state_;
	}

	db() {
		return this.db_;
	}

	api() {
		return this.api_;
	}

	loadParentAndItem(change) {
		if (change.item_type == BaseModel.ITEM_TYPE_NOTE) {
			return Note.load(change.item_id).then((note) => {
				if (!note) return { parent:null, item: null };

				return Folder.load(note.parent_id).then((folder) => {
					return Promise.resolve({ parent: folder, item: note });
				});
			});
		} else {
			return Folder.load(change.item_id).then((folder) => {
				return Promise.resolve({ parent: null, item: folder });
			});
		}
	}

	remoteFileByPath(remoteFiles, path) {
		for (let i = 0; i < remoteFiles.length; i++) {
			if (remoteFiles[i].path == path) return remoteFiles[i];
		}
		return null;
	}

	conflictDir(remoteFiles) {
		let d = this.remoteFileByPath('Conflicts');
		if (!d) {
			return this.api().mkdir('Conflicts').then(() => {
				return 'Conflicts';
			});
		} else {
			return Promise.resolve('Conflicts');
		}
	}

	moveConflict(item) {
		// No need to handle folder conflicts
		if (item.type == 'folder') return Promise.resolve();

		return this.conflictDir().then((conflictDirPath) => {
			let p = path.basename(item.path).split('.');
			let pos = item.type == 'folder' ? p.length - 1 : p.length - 2;
			p.splice(pos, 0, moment().format('YYYYMMDDThhmmss'));
			let newPath = p.join('.');
			return this.api().move(item.path, conflictDirPath + '/' + newPath);
		});
	}

	// isNewerThan(date1, date2) {
	// 	return date1 > date2;
	// }

	itemByPath(items, path) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].path == path) return items[i];
		}
		return null;
	}

	itemIsSameDate(item, date) {
		return Math.abs(item.updatedTime - date) <= 1;
	}

	itemIsNewerThan(item, date) {
		if (this.itemIsSameDate(item, date)) return false;
		return item.updatedTime > date;
	}

	itemIsOlderThan(item, date) {
		if (this.itemIsSameDate(item, date)) return false;
		return item.updatedTime < date;
	}

	dbItemToSyncItem(dbItem) {
		if (!dbItem) return null;

		let itemType = BaseModel.identifyItemType(dbItem);

		return {
			type: itemType == BaseModel.ITEM_TYPE_FOLDER ? 'folder' : 'note',
			path: Folder.systemPath(dbItem),
			syncTime: dbItem.sync_time,
			updatedTime: dbItem.updated_time,
			dbItem: dbItem,
		};
	}

	remoteItemToSyncItem(remoteItem) {
		if (!remoteItem) return null;

		return {
			type: remoteItem.content.type,
			path: remoteItem.path,
			syncTime: 0,
			updatedTime: remoteItem.updatedTime,
			remoteItem: remoteItem,
		};
	}

	syncAction(localItem, remoteItem, deletedLocalPaths) {
		let output = this.syncActions(localItem ? [localItem] : [], remoteItem ? [remoteItem] : [], deletedLocalPaths);
		if (output.length > 1) throw new Error('Invalid number of actions returned');
		return output.length ? output[0] : null;
	}

	// Assumption: it's not possible to, for example, have a directory one the dest
	// and a file with the same name on the source. It's not possible because the
	// file and directory names are UUID so should be unique.
	// Each item must have these properties:
	// - path
	// - type
	// - syncTime
	// - updatedTime
	syncActions(localItems, remoteItems, deletedLocalPaths) {
		let output = [];
		let donePaths = [];

		// console.info('==================================================');
		// console.info(localItems, remoteItems);

		for (let i = 0; i < localItems.length; i++) {
			let local = localItems[i];
			let remote = this.itemByPath(remoteItems, local.path);

			let action = {
				local: local,
				remote: remote,
			};

			if (!remote) {
				if (local.syncTime) {
					// The item has been synced previously and now is no longer in the dest
					// which means it has been deleted.
					action.type = 'delete';
					action.dest = 'local';
				} else {
					// The item has never been synced and is not present in the dest
					// which means it is new
					action.type = 'create';
					action.dest = 'remote';
				}
			} else {
				if (this.itemIsOlderThan(local, local.syncTime)) continue;

				if (this.itemIsOlderThan(remote, local.syncTime)) {
					action.type = 'update';
					action.dest = 'remote';
				} else {
					action.type = 'conflict';
					if (local.type == 'folder') {
						// For folders, currently we don't completely handle conflicts, we just
						// we just update the local dir (.folder metadata file) with the remote
						// version. It means the local version is lost but shouldn't be a big deal
						// and should be rare (at worst, the folder name needs to renamed).
						action.solution = [
							{ type: 'update', dest: 'local' },
						];
					} else {
						action.solution = [
							{ type: 'copy-to-remote-conflict-dir', dest: 'local' },
							{ type: 'copy-to-local-conflict-dir', dest: 'local' },
							{ type: 'update', dest: 'local' },
						];
					}
				}
			}

			donePaths.push(local.path);

			output.push(action);
		}

		for (let i = 0; i < remoteItems.length; i++) {
			let remote = remoteItems[i];
			if (donePaths.indexOf(remote.path) >= 0) continue; // Already handled in the previous loop
			let local = this.itemByPath(localItems, remote.path);

			let action = {
				local: local,
				remote: remote,
			};

			if (!local) {
				if (deletedLocalPaths.indexOf(remote.path) >= 0) {
					action.type = 'delete';
					action.dest = 'remote';
				} else {
					action.type = 'create';
					action.dest = 'local';
				}
			} else {
				if (this.itemIsOlderThan(remote, local.syncTime)) continue; // Already have this version
				// Note: no conflict is possible here since if the local item has been
				// modified since the last sync, it's been processed in the previous loop.
				action.type = 'update';
				action.dest = 'local';
			}

			output.push(action);
		}

		// console.info('-----------------------------------------');
		// console.info(output);

		return output;
	}

	processState(state) {
		Log.info('Sync: processing: ' + state);
		this.state_ = state;

		if (state == 'uploadChanges') {
			return this.processState_uploadChanges();
		} else if (state == 'downloadChanges') {
			//return this.processState('idle');
			return this.processState_downloadChanges();
		} else if (state == 'idle') {
			// Nothing
			return Promise.resolve();
		} else {
			throw new Error('Invalid state: ' . state);
		}
	}

	processSyncAction(action) {
		//console.info('Sync action: ', action);
		//console.info('Sync action: ' + JSON.stringify(action));

		if (!action) return Promise.resolve();

		if (action.type == 'conflict') {

		} else {
			let syncItem = action[action.dest == 'local' ? 'remote' : 'local'];
			let path = syncItem.path;

			if (action.type == 'create') {
				if (action.dest == 'remote') {
					let content = null;

					if (syncItem.type == 'folder') {
						content = Folder.toFriendlyString(syncItem.dbItem);
					} else {
						content = Note.toFriendlyString(syncItem.dbItem);
					}

					return this.api().put(path, content).then(() => {
						return this.api().setTimestamp(path, syncItem.updatedTime);
					});
				} else {
					let dbItem = syncItem.remoteItem.content;
					dbItem.sync_time = time.unix();
					if (syncItem.type == 'folder') {
						return Folder.save(dbItem, { isNew: true });
					} else {
						return Note.save(dbItem, { isNew: true });
					}
				}
			}

			if (action.type == 'update') {
				if (action.dest == 'remote') {
					// let content = null;

					// if (syncItem.type == 'folder') {
					// 	content = Folder.toFriendlyString(syncItem.dbItem);
					// } else {
					// 	content = Note.toFriendlyString(syncItem.dbItem);
					// }

					// return this.api().put(path, content).then(() => {
					// 	return this.api().setTimestamp(path, syncItem.updatedTime);
					// });
				} else {
					let dbItem = syncItem.remoteItem.content;
					dbItem.sync_time = time.unix();
					return NoteFolderService.save(syncItem.type, dbItem, action.local.dbItem);
					// let dbItem = syncItem.remoteItem.content;
					// dbItem.sync_time = time.unix();
					// if (syncItem.type == 'folder') {
					// 	return Folder.save(dbItem, { isNew: true });
					// } else {
					// 	return Note.save(dbItem, { isNew: true });
					// }
				}
			}
		}

		return Promise.resolve(); // TODO
	}

	async processLocalItem(dbItem) {
		let localItem = this.dbItemToSyncItem(dbItem);
		
		let remoteItem = await this.api().stat(localItem.path);
		let action = this.syncAction(localItem, remoteItem, []);
		await this.processSyncAction(action);

		dbItem.sync_time = time.unix();
		if (localItem.type == 'folder') {
			return Folder.save(dbItem);
		} else {
			return Note.save(dbItem);
		}
	}

	async processRemoteItem(remoteItem) {
		let content = await this.api().get(remoteItem.path);
		remoteItem.content = Note.fromFriendlyString(content);
		let remoteSyncItem = this.remoteItemToSyncItem(remoteItem);

		let dbItem = await BaseItem.loadItemByPath(remoteItem.path);
		let localSyncItem = this.dbItemToSyncItem(dbItem);

		let action = this.syncAction(localSyncItem, remoteSyncItem, []);
		return this.processSyncAction(action);
	}

	async processState_uploadChanges() {
		while (true) {
			let result = await NoteFolderService.itemsThatNeedSync(50);
			for (let i = 0; i < result.items.length; i++) {
				let item = result.items[i];
				await this.processLocalItem(item);
			}

			if (!result.hasMore) break;
		}

		return this.processState('downloadChanges');
	}

	async processState_downloadChanges() {
		let items = await this.api().list();
		for (let i = 0; i < items.length; i++) {
			await this.processRemoteItem(items[i]);
		}
	}

	start() {
		Log.info('Sync: start');

		if (this.state() != 'idle') {
			return Promise.reject('Cannot start synchronizer because synchronization already in progress. State: ' + this.state());
		}

		this.state_ = 'started';

		// if (!this.api().session()) {
		// 	Log.info("Sync: cannot start synchronizer because user is not logged in.");
		// 	return;
		// }

		return this.processState('uploadChanges');
	}

	

}

export { Synchronizer };