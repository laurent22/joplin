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
import { sprintf } from 'sprintf-js';
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

	itemByPath(items, path) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].path == path) return items[i];
		}
		return null;
	}

	itemIsSameDate(item, date) {
		return item.updatedTime === date;
	}

	itemIsStrictlyNewerThan(item, date) {
		return item.updatedTime > date;
	}

	itemIsStrictlyOlderThan(item, date) {
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
					action.type = 'delete';
					action.dest = 'local';
					action.reason = 'Local has been synced to remote previously, but remote no longer exist, which means remote has been deleted';
				} else {
					action.type = 'create';
					action.dest = 'remote';
					action.reason = 'Local has never been synced to remote, and remote does not exists, which means remote must be created';
				}
			} else {
				if (this.itemIsStrictlyOlderThan(local, local.syncTime)) continue;

				if (this.itemIsStrictlyOlderThan(remote, local.updatedTime)) {
					action.type = 'update';
					action.dest = 'remote';
					action.reason = sprintf('Remote (%s) was modified after last sync of local (%s).', moment.unix(remote.updatedTime).toISOString(), moment.unix(local.syncTime).toISOString(),);
				} else if (this.itemIsStrictlyNewerThan(remote, local.syncTime)) {
					action.type = 'conflict';
					action.reason = sprintf('Both remote (%s) and local (%s) were modified after the last sync (%s).',
						moment.unix(remote.updatedTime).toISOString(),
						moment.unix(local.updatedTime).toISOString(),
						moment.unix(local.syncTime).toISOString()
					);

					if (local.type == 'folder') {
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
				} else {
					continue; // Neither local nor remote item have been changed recently
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
				if (this.itemIsStrictlyOlderThan(remote, local.syncTime)) continue; // Already have this version

				// Note: no conflict is possible here since if the local item has been
				// modified since the last sync, it's been processed in the previous loop.
				// So throw an exception is this normally impossible condition happens anyway.
				// It's handled at condition this.itemIsStrictlyNewerThan(remote, local.syncTime) in above loop
				if (this.itemIsStrictlyNewerThan(remote, local.syncTime)) throw new Error('Remote cannot be newer than last sync time.');

				if (this.itemIsStrictlyNewerThan(remote, local.updatedTime)) {
					action.type = 'update';
					action.dest = 'local';
					action.reason = sprintf('Remote (%s) was modified after local (%s).', moment.unix(remote.updatedTime).toISOString(), moment.unix(local.updatedTime).toISOString(),);;
				} else {
					continue;
				}
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

		console.info('Sync action: ' + action.type + ' ' + action.dest + ': ' + action.reason);

		if (action.type == 'conflict') {
			console.info(action);

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
					dbItem.updated_time = dbItem.sync_time;
					if (syncItem.type == 'folder') {
						return Folder.save(dbItem, { isNew: true, autoTimestamp: false });
					} else {
						return Note.save(dbItem, { isNew: true, autoTimestamp: false });
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
					dbItem.updated_time = dbItem.sync_time;
					return NoteFolderService.save(syncItem.type, dbItem, action.local.dbItem, { autoTimestamp: false });
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
		if (!content) throw new Error('Cannot get content for: ' + remoteItem.path);
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
			console.info('Items that need sync: ' + result.items.length);
			for (let i = 0; i < result.items.length; i++) {
				let item = result.items[i];
				await this.processLocalItem(item);
			}

			if (!result.hasMore) break;
		}

		//console.info('DOWNLOAD CHANGE DISABLED'); return Promise.resolve(); 
		
		return this.processState('downloadChanges');
	}

	async processState_downloadChanges() {
		let items = await this.api().list();
		for (let i = 0; i < items.length; i++) {
			await this.processRemoteItem(items[i]);
		}

		return this.processState('idle');
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

		return this.processState('uploadChanges').catch((error) => {
			console.info('Synchronizer error:', error);
			throw error;
		});
	}

	

}

export { Synchronizer };