import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Resource } from 'lib/models/resource.js';
import { BaseModel } from 'lib/base-model.js';
import { sprintf } from 'sprintf-js';
import { time } from 'lib/time-utils.js';
import { Logger } from 'lib/logger.js'
import { _ } from 'lib/locale.js';
import moment from 'moment';

class Synchronizer {

	constructor(db, api, appType) {
		this.state_ = 'idle';
		this.db_ = db;
		this.api_ = api;
		this.syncDirName_ = '.sync';
		this.resourceDirName_ = '.resource';
		this.logger_ = new Logger();
		this.appType_ = appType;
		this.cancelling_ = false;

		this.onProgress_ = function(s) {};
		this.progressReport_ = {};

		this.dispatch = function(action) {};
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

	static reportToLines(report) {
		let lines = [];
		if (report.createLocal) lines.push(_('Created local items: %d.', report.createLocal));
		if (report.updateLocal) lines.push(_('Updated local items: %d.', report.updateLocal));
		if (report.createRemote) lines.push(_('Created remote items: %d.', report.createRemote));
		if (report.updateRemote) lines.push(_('Updated remote items: %d.', report.updateRemote));
		if (report.deleteLocal) lines.push(_('Deleted local items: %d.', report.deleteLocal));
		if (report.deleteRemote) lines.push(_('Deleted remote items: %d.', report.deleteRemote));
		if (report.state) lines.push(_('State: %s.', report.state.replace(/_/g, ' ')));
		if (report.errors && report.errors.length) lines.push(_('Last error: %s (stacktrace in log).', report.errors[report.errors.length-1].message));
		if (report.cancelling && !report.completedTime) lines.push(_('Cancelling...'));
		if (report.completedTime) lines.push(_('Completed: %s', time.unixMsToLocalDateTime(report.completedTime)));

		return lines;
	}

	logSyncOperation(action, local = null, remote = null, message = null) {
		let line = ['Sync'];
		line.push(action);
		if (message) line.push(message);

		let type = local && local.type_ ? local.type_ : null;
		if (!type) type = remote && remote.type_ ? remote.type_ : null;

		if (type) line.push(BaseItem.modelTypeToClassName(type));

		if (local) {
			let s = [];
			s.push(local.id);
			if ('title' in local) s.push('"' + local.title + '"');
			line.push('(Local ' + s.join(', ') + ')');
		}

		if (remote) {
			let s = [];
			s.push(remote.id ? remote.id : remote.path);
			if ('title' in remote) s.push('"' + remote.title + '"');
			line.push('(Remote ' + s.join(', ') + ')');
		}

		this.logger().debug(line.join(': '));

		if (!this.progressReport_[action]) this.progressReport_[action] = 0;
		this.progressReport_[action]++;
		this.progressReport_.state = this.state();
		this.onProgress_(this.progressReport_);

		this.dispatch({ type: 'SYNC_REPORT_UPDATE', report: Object.assign({}, this.progressReport_) });
	}

	async logSyncSummary(report) {
		this.logger().info('Operations completed: ');
		for (let n in report) {
			if (!report.hasOwnProperty(n)) continue;
			if (n == 'errors') continue;
			this.logger().info(n + ': ' + (report[n] ? report[n] : '-'));
		}
		let folderCount = await Folder.count();
		let noteCount = await Note.count();
		let resourceCount = await Resource.count();
		this.logger().info('Total folders: ' + folderCount);
		this.logger().info('Total notes: ' + noteCount);
		this.logger().info('Total resources: ' + resourceCount);

		if (report.errors && report.errors.length) {
			this.logger().warn('There was some errors:');
			for (let i = 0; i < report.errors.length; i++) {
				let e = report.errors[i];
				this.logger().warn(e);
			}
		}
	}

	randomFailure(options, name) {
		if (!options.randomFailures) return false;

		if (this.randomFailureChoice_ == name) {
			options.onMessage('Random failure: ' + name);
			return true;
		}

		return false;
	}

	cancel() {
		if (this.cancelling_) return;
		
		this.logSyncOperation('cancelling', null, null, '');
		this.cancelling_ = true;
	}

	cancelling() {
		return this.cancelling_;
	}

	async start(options = null) {
		if (!options) options = {};
		this.onProgress_ = options.onProgress ? options.onProgress : function(o) {};
		this.progressReport_ = { errors: [] };

		const syncTargetId = this.api().driver().syncTargetId();

		if (this.state() != 'idle') {
			this.logger().info('Synchronization is already in progress. State: ' + this.state());
			return;
		}	

		this.randomFailureChoice_ = Math.floor(Math.random() * 5);
		this.cancelling_ = false;

		// ------------------------------------------------------------------------
		// First, find all the items that have been changed since the
		// last sync and apply the changes to remote.
		// ------------------------------------------------------------------------

		let synchronizationId = time.unixMs().toString();

		this.state_ = 'in_progress';

		this.dispatch({ type: 'SYNC_STARTED' });

		this.logSyncOperation('starting', null, null, 'Starting synchronization to ' + this.api().driver().syncTargetName() + ' (' + syncTargetId + ')... [' + synchronizationId + ']');

		try {
			await this.api().mkdir(this.syncDirName_);
			await this.api().mkdir(this.resourceDirName_);

			let donePaths = [];
			while (true) {
				if (this.cancelling()) break;

				let result = await BaseItem.itemsThatNeedSync(syncTargetId);
				let locals = result.items;

				for (let i = 0; i < locals.length; i++) {
					if (this.cancelling()) break;

					let local = locals[i];
					let ItemClass = BaseItem.itemClass(local);
					let path = BaseItem.systemPath(local);

					// Safety check to avoid infinite loops:
					if (donePaths.indexOf(path) > 0) throw new Error(sprintf('Processing a path that has already been done: %s. sync_time was not updated?', path));

					let remote = await this.api().stat(path);
					let content = await ItemClass.serialize(local);
					let action = null;
					let updateSyncTimeOnly = true;
					let reason = '';

					if (!remote) {
						if (!local.sync_time) {
							action = 'createRemote';
							reason = 'remote does not exist, and local is new and has never been synced';
						} else {
							// Note or item was modified after having been deleted remotely
							action = local.type_ == BaseModel.TYPE_NOTE ? 'noteConflict' : 'itemConflict';
							reason = 'remote has been deleted, but local has changes';
						}
					} else {
						if (remote.updated_time > local.sync_time) {
							// Since, in this loop, we are only dealing with notes that require sync, if the
							// remote has been modified after the sync time, it means both notes have been
							// modified and so there's a conflict.
							action = local.type_ == BaseModel.TYPE_NOTE ? 'noteConflict' : 'itemConflict';
							reason = 'both remote and local have changes';
						} else {
							action = 'updateRemote';
							reason = 'local has changes';
						}
					}

					this.logSyncOperation(action, local, remote, reason);

					if (local.type_ == BaseModel.TYPE_RESOURCE && (action == 'createRemote' || (action == 'itemConflict' && remote))) {
						let remoteContentPath = this.resourceDirName_ + '/' + local.id;
						let resourceContent = await Resource.content(local);
						await this.api().put(remoteContentPath, resourceContent);
					}

					if (action == 'createRemote' || action == 'updateRemote') {

						// Make the operation atomic by doing the work on a copy of the file
						// and then copying it back to the original location.
						// let tempPath = this.syncDirName_ + '/' + path + '_' + time.unixMs();
						//
						// Atomic operation is disabled for now because it's not possible
						// to do an atomic move with OneDrive (see file-api-driver-onedrive.js)
						
						// await this.api().put(tempPath, content);
						// await this.api().setTimestamp(tempPath, local.updated_time);
						// await this.api().move(tempPath, path);

						await this.api().put(path, content);

						if (this.randomFailure(options, 0)) return;

						await this.api().setTimestamp(path, local.updated_time);

						if (this.randomFailure(options, 1)) return;

						await ItemClass.saveSyncTime(syncTargetId, local, time.unixMs());

					} else if (action == 'itemConflict') {

						if (remote) {
							let remoteContent = await this.api().get(path);
							local = await BaseItem.unserialize(remoteContent);

							const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
							await ItemClass.save(local, { autoTimestamp: false, nextQueries: syncTimeQueries });
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

						if (this.randomFailure(options, 2)) return;

						if (remote) {
							let remoteContent = await this.api().get(path);
							local = await BaseItem.unserialize(remoteContent);

							const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
							await ItemClass.save(local, { autoTimestamp: false, nextQueries: syncTimeQueries });
						} else {
							await ItemClass.delete(local.id);
						}

					}

					donePaths.push(path);
				}

				if (!result.hasMore) break;
			}

			// ------------------------------------------------------------------------
			// Delete the remote items that have been deleted locally.
			// ------------------------------------------------------------------------

			let deletedItems = await BaseItem.deletedItems();
			for (let i = 0; i < deletedItems.length; i++) {
				if (this.cancelling()) break;

				let item = deletedItems[i];
				let path = BaseItem.systemPath(item.item_id)
				this.logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
				await this.api().delete(path);
				if (this.randomFailure(options, 3)) return;
				await BaseItem.remoteDeletedItem(item.item_id);
			}

			// ------------------------------------------------------------------------
			// Loop through all the remote items, find those that
			// have been updated, and apply the changes to local.
			// ------------------------------------------------------------------------

			// At this point all the local items that have changed have been pushed to remote
			// or handled as conflicts, so no conflict is possible after this.

			let remoteIds = [];
			let context = null;

			while (true) {
				if (this.cancelling()) break;

				let listResult = await this.api().list('', { context: context });
				let remotes = listResult.items;
				for (let i = 0; i < remotes.length; i++) {
					if (this.cancelling()) break;

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
							reason = sprintf('remote is more recent than local');
						}
					}

					if (!action) continue;

					if (action == 'createLocal' || action == 'updateLocal') {
						let content = await this.api().get(path);
						if (content === null) {
							this.logger().warn('Remote has been deleted between now and the list() call? In that case it will be handled during the next sync: ' + path);
							continue;
						}
						content = await BaseItem.unserialize(content);
						let ItemClass = BaseItem.itemClass(content);

						let newContent = Object.assign({}, content);
						let options = {
							autoTimestamp: false,
							applyMetadataChanges: true,
							nextQueries: BaseItem.updateSyncTimeQueries(syncTargetId, newContent, time.unixMs()),
						};
						if (action == 'createLocal') options.isNew = true;

						if (newContent.type_ == BaseModel.TYPE_RESOURCE && action == 'createLocal') {
							let localResourceContentPath = Resource.fullPath(newContent);
							let remoteResourceContentPath = this.resourceDirName_ + '/' + newContent.id;
							await this.api().get(remoteResourceContentPath, { path: localResourceContentPath, target: 'file' });
						}

						await ItemClass.save(newContent, options);

						this.logSyncOperation(action, local, content, reason);
					} else {
						this.logSyncOperation(action, local, remote, reason);
					}
				}

				if (!listResult.hasMore) break;
				context = listResult.context;
			}

			// ------------------------------------------------------------------------
			// Search, among the local IDs, those that don't exist remotely, which
			// means the item has been deleted.
			// ------------------------------------------------------------------------

			if (this.randomFailure(options, 4)) return;

			let localFoldersToDelete = [];

			if (!this.cancelling()) {
				let syncItems = await BaseItem.syncedItems(syncTargetId);
				for (let i = 0; i < syncItems.length; i++) {
					if (this.cancelling()) break;

					let syncItem = syncItems[i];
					if (remoteIds.indexOf(syncItem.item_id) < 0) {
						if (syncItem.item_type == Folder.modelType()) {
							localFoldersToDelete.push(syncItem);
							continue;
						}

						this.logSyncOperation('deleteLocal', { id: syncItem.item_id }, null, 'remote has been deleted');

						let ItemClass = BaseItem.itemClass(syncItem.item_type);
						await ItemClass.delete(syncItem.item_id, { trackDeleted: false });
					}
				}
			}

			if (!this.cancelling()) {
				for (let i = 0; i < localFoldersToDelete.length; i++) {
					const syncItem = localFoldersToDelete[i];
					const noteIds = await Folder.noteIds(syncItem.item_id);
					if (noteIds.length) { // CONFLICT
						await Folder.markNotesAsConflict(syncItem.item_id);
					}
					await Folder.delete(syncItem.item_id, { deleteChildren: false });
				}
			}

			if (!this.cancelling()) {
				await BaseItem.deleteOrphanSyncItems();
			}
		} catch (error) {
			this.logger().error(error);
			this.progressReport_.errors.push(error);
		}

		if (this.cancelling()) {
			this.logger().info('Synchronization was cancelled.');
			this.cancelling_ = false;
		}

		this.state_ = 'idle';

		this.progressReport_.completedTime = time.unixMs();

		this.logSyncOperation('finished', null, null, 'Synchronization finished [' + synchronizationId + ']');

		await this.logSyncSummary(this.progressReport_);

		this.onProgress_ = function(s) {};
		this.progressReport_ = {};

		this.dispatch({ type: 'SYNC_COMPLETED' });
	}

}

export { Synchronizer };