require('babel-plugin-transform-runtime');

import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseModel } from 'lib/base-model.js';
import { sprintf } from 'sprintf-js';
import { time } from 'lib/time-utils.js';
import { Logger } from 'lib/logger.js'
import moment from 'moment';

class Synchronizer {

	constructor(db, api) {
		this.state_ = 'idle';
		this.db_ = db;
		this.api_ = api;
		this.syncDirName_ = '.sync';
		this.logger_ = new Logger();
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

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	logSyncOperation(action, local, remote, reason) {
		let line = ['Sync'];
		line.push(action);
		line.push(reason);

		if (local) {
			let s = [];
			s.push(local.id);
			if ('title' in local) s.push('"' + local.title + '"');
			line.push('(Local ' + s.join(', ') + ')');
		}

		if (remote) {
			let s = [];
			s.push(remote.id);
			if ('title' in remote) s.push('"' + remote.title + '"');
			line.push('(Remote ' + s.join(', ') + ')');
		}

		this.logger().debug(line.join(': '));
	}

	async logSyncSummary(report) {
		for (let n in report) {
			this.logger().info(n + ': ' + (report[n] ? report[n] : '-'));
		}
		let folderCount = await Folder.count();
		let noteCount = await Note.count();
		this.logger().info('Total folders: ' + folderCount);
		this.logger().info('Total notes: ' + noteCount);
	}

	async createWorkDir() {
		if (this.syncWorkDir_) return this.syncWorkDir_;
		let dir = await this.api().mkdir(this.syncDirName_);
		return this.syncDirName_;
	}

	async start() {
		if (this.state() != 'idle') {
			this.logger().warn('Synchronization is already in progress. State: ' + this.state());
			return;
		}	

		// ------------------------------------------------------------------------
		// First, find all the items that have been changed since the
		// last sync and apply the changes to remote.
		// ------------------------------------------------------------------------

		let synchronizationId = time.unixMs().toString();
		this.logger().info('Starting synchronization... [' + synchronizationId + ']');

		this.state_ = 'started';

		let report = {
			createLocal: 0,
			updateLocal: 0,
			deleteLocal: 0,
			createRemote: 0,
			updateRemote: 0,
			deleteRemote: 0,
			folderConflict: 0,
			noteConflict: 0,
		};

		await this.createWorkDir();

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
				let reason = '';

				if (!remote) {
					if (!local.sync_time) {
						action = 'createRemote';
						reason = 'remote does not exist, and local is new and has never been synced';
					} else {
						// Note or folder was modified after having been deleted remotely
						action = local.type_ == BaseModel.MODEL_TYPE_NOTE ? 'noteConflict' : 'folderConflict';
						reason = 'remote has been deleted, but local has changes';
					}
				} else {
					if (remote.updated_time > local.sync_time) {
						// Since, in this loop, we are only dealing with notes that require sync, if the
						// remote has been modified after the sync time, it means both notes have been
						// modified and so there's a conflict.
						action = local.type_ == BaseModel.MODEL_TYPE_NOTE ? 'noteConflict' : 'folderConflict';
						reason = 'both remote and local have changes';
					} else {
						action = 'updateRemote';
						reason = 'local has changes';
					}
				}

				this.logSyncOperation(action, local, remote, reason);

				if (action == 'createRemote' || action == 'updateRemote') {

					// Make the operation atomic by doing the work on a copy of the file
					// and then copying it back to the original location.
					let tempPath = this.syncDirName_ + '/' + path + '_' + time.unixMs();
					
					await this.api().put(tempPath, content);
					await this.api().setTimestamp(tempPath, local.updated_time);
					await this.api().move(tempPath, path);
					
					await ItemClass.save({ id: local.id, sync_time: time.unixMs(), type_: local.type_ }, { autoTimestamp: false });

				} else if (action == 'folderConflict') {

					if (remote) {
						let remoteContent = await this.api().get(path);
						local = BaseItem.unserialize(remoteContent);

						local.sync_time = time.unixMs();
						await ItemClass.save(local, { autoTimestamp: false });
					} else {
						await ItemClass.delete(local.id);
					}

				} else if (action == 'noteConflict') {

					// - Create a duplicate of local note into Conflicts folder (to preserve the user's changes)
					// - Overwrite local note with remote note
					let conflictedNote = Object.assign({}, local);
					delete conflictedNote.id;
					conflictedNote.is_conflict = 1;
					await Note.save(conflictedNote, { autoTimestamp: false });

					if (remote) {
						let remoteContent = await this.api().get(path);
						local = BaseItem.unserialize(remoteContent);

						local.sync_time = time.unixMs();
						await ItemClass.save(local, { autoTimestamp: false });
					}

				}

				report[action]++;

				donePaths.push(path);
			}

			if (!result.hasMore) break;
		}

		// ------------------------------------------------------------------------
		// Delete the remote items that have been deleted locally.
		// ------------------------------------------------------------------------

		let deletedItems = await BaseModel.deletedItems();
		for (let i = 0; i < deletedItems.length; i++) {
			let item = deletedItems[i];
			let path = BaseItem.systemPath(item.item_id)
			this.logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
			await this.api().delete(path);
			await BaseModel.remoteDeletedItem(item.item_id);

			report['deleteRemote']++;
		}

		// ------------------------------------------------------------------------
		// Loop through all the remote items, find those that
		// have been updated, and apply the changes to local.
		// ------------------------------------------------------------------------

		// At this point all the local items that have changed have been pushed to remote
		// or handled as conflicts, so no conflict is possible after this.

		let remoteIds = [];
		let remotes = await this.api().list();
		for (let i = 0; i < remotes.length; i++) {
			let remote = remotes[i];
			let path = remote.path;

			remoteIds.push(BaseItem.pathToId(path));
			if (donePaths.indexOf(path) > 0) continue;

			let action = null;
			let reason = '';
			let local = await BaseItem.loadItemByPath(path);
			if (!local) {
				action = 'createLocal';
				reason = 'remote exists but local does not';
			} else {
				if (remote.updated_time > local.updated_time) {
					action = 'updateLocal';
					reason = sprintf('remote is more recent than local'); // , time.unixMsToIso(remote.updated_time), time.unixMsToIso(local.updated_time)
				}
			}

			if (!action) continue;

			if (action == 'createLocal' || action == 'updateLocal') {
				let content = await this.api().get(path);
				if (!content) {
					this.logger().warn('Remote has been deleted between now and the list() call? In that case it will be handled during the next sync: ' + path);
					continue;
				}
				content = BaseItem.unserialize(content);
				let ItemClass = BaseItem.itemClass(content);

				let newContent = Object.assign({}, content);
				newContent.sync_time = time.unixMs();
				let options = { autoTimestamp: false };
				if (action == 'createLocal') options.isNew = true;
				await ItemClass.save(newContent, options);

				this.logSyncOperation(action, local, content, reason);
			} else {
				this.logSyncOperation(action, local, remote, reason);
			}

			report[action]++;
		}

		// ------------------------------------------------------------------------
		// Search, among the local IDs, those that don't exist remotely, which
		// means the item has been deleted.
		// ------------------------------------------------------------------------

		let noteIds = await Folder.syncedNoteIds();
		for (let i = 0; i < noteIds.length; i++) {
			let noteId = noteIds[i];
			if (remoteIds.indexOf(noteId) < 0) {
				this.logSyncOperation('deleteLocal', { id: noteId }, null, 'remote has been deleted');
				await Note.delete(noteId, { trackDeleted: false });
				report['deleteLocal']++;
			}
		}

		this.logger().info('Synchronization complete [' + synchronizationId + ']:');
		await this.logSyncSummary(report);

		this.state_ = 'idle';

		return Promise.resolve();
	}

}

export { Synchronizer };