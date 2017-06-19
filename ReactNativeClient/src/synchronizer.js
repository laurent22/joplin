require('babel-plugin-transform-runtime');

import { BaseItem } from 'src/models/base-item.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { BaseModel } from 'src/base-model.js';
import { sprintf } from 'sprintf-js';
import { time } from 'src/time-utils.js';
import { Log } from 'src/log.js'

class Synchronizer {

	constructor(db, api) {
		this.db_ = db;
		this.api_ = api;
	}

	db() {
		return this.db_;
	}

	api() {
		return this.api_;
	}

	async start() {
		// ------------------------------------------------------------------------
		// First, find all the items that have been changed since the
		// last sync and apply the changes to remote.
		// ------------------------------------------------------------------------

		let donePaths = [];
		while (true) {
			let result = await BaseItem.itemsThatNeedSync();
			let locals = result.items;

			for (let i = 0; i < locals.length; i++) {
				let local = locals[i];
				let ItemClass = BaseItem.itemClass(local);
				let path = BaseItem.systemPath(local);

				// Safety check to avoid infinite loops:
				if (donePaths.indexOf(path) > 0) throw new Error(sprintf('Processing a path that has already been done: %s. sync_time was not updated?', path));

				let remote = await this.api().stat(path);
				let content = ItemClass.serialize(local);
				let action = null;
				let updateSyncTimeOnly = true;

				if (!remote) {
					action = 'createRemote';
				} else {
					if (remote.updated_time > local.sync_time) {
						// Since, in this loop, we are only dealing with notes that require sync, if the
						// remote has been modified after the sync time, it means both notes have been
						// modified and so there's a conflict.
						action = local.type_ == BaseModel.MODEL_TYPE_NOTE ? 'noteConflict' : 'folderConflict';
					} else {
						action = 'updateRemote';
					}
				}

				console.info('Sync action (1): ' + action);

				if (action == 'createRemote' || action == 'updateRemote') {
					await this.api().put(path, content);
					await this.api().setTimestamp(path, local.updated_time);
				} else if (action == 'folderConflict') {
					let remoteContent = await this.api().get(path);
					local = BaseItem.unserialize(remoteContent);
					updateSyncTimeOnly = false;
				} else if (action == 'noteConflict') {
					// - Create a duplicate of local note into Conflicts folder (to preserve the user's changes)
					// - Overwrite local note with remote note
					let conflictFolder = await Folder.conflictFolder();
					let conflictedNote = Object.assign({}, local);
					delete conflictedNote.id;
					conflictedNote.parent_id = conflictFolder.id;
					await Note.save(conflictedNote, { autoTimestamp: false });

					let remoteContent = await this.api().get(path);
					local = BaseItem.unserialize(remoteContent);
					updateSyncTimeOnly = false;
				}

				let newLocal = null;
				if (updateSyncTimeOnly) {
					newLocal = { id: local.id, sync_time: time.unixMs(), type_: local.type_ };
				} else {
					newLocal = local;
					newLocal.sync_time = time.unixMs();
				}

				await ItemClass.save(newLocal, { autoTimestamp: false });

				donePaths.push(path);
			}

			if (!result.hasMore) break;
		}

		// ------------------------------------------------------------------------
		// Then, loop through all the remote items, find those that
		// have been updated, and apply the changes to local.
		// ------------------------------------------------------------------------

		// At this point all the local items that have changed have been pushed to remote
		// or handled as conflicts, so no conflict is possible after this.

		let remotes = await this.api().list();
		for (let i = 0; i < remotes.length; i++) {
			let remote = remotes[i];
			let path = remote.path;
			if (donePaths.indexOf(path) > 0) continue;

			let action = null;
			let local = await BaseItem.loadItemByPath(path);
			if (!local) {
				action = 'createLocal';
			} else {
				if (remote.updated_time > local.updated_time) {
					action = 'updateLocal';
				}
			}

			if (!action) continue;

			console.info('Sync action (2): ' + action);

			if (action == 'createLocal' || action == 'updateLocal') {
				let content = await this.api().get(path);
				if (!content) {
					Log.warn('Remote item has been deleted between now and the list() call? In that case it will handled during the next sync: ' + path);
					continue;
				}
				content = BaseItem.unserialize(content);
				let ItemClass = BaseItem.itemClass(content);

				content.sync_time = time.unixMs();
				let options = { autoTimestamp: false };
				if (action == 'createLocal') options.isNew = true;
				await ItemClass.save(content, options);
			}
		}


		return Promise.resolve();
	}

}

export { Synchronizer };