const { BaseItem } = require('lib/models/base-item.js');
const { Folder } = require('lib/models/folder.js');
const { Note } = require('lib/models/note.js');
const { Resource } = require('lib/models/resource.js');
const { BaseModel } = require('lib/base-model.js');
const { sprintf } = require('sprintf-js');
const { time } = require('lib/time-utils.js');
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim.js');
const moment = require('moment');

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
		if (!report.completedTime && report.state) lines.push(_('State: "%s".', report.state));
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
			if (n == 'starting') continue;
			if (n == 'finished') continue;
			if (n == 'state') continue;
			if (n == 'completedTime') continue;
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

	async cancel() {
		if (this.cancelling_ || this.state() == 'idle') return;
		
		this.logSyncOperation('cancelling', null, null, '');
		this.cancelling_ = true;

		return new Promise((resolve, reject) => {
			const iid = setInterval(() => {
				if (this.state() == 'idle') {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	cancelling() {
		return this.cancelling_;
	}

	async start(options = null) {
		if (!options) options = {};

		if (this.state() != 'idle') {
			let error = new Error(_('Synchronisation is already in progress. State: %s', this.state()));
			error.code = 'alreadyStarted';
			throw error;
			return;
		}

		this.state_ = 'in_progress';

		this.onProgress_ = options.onProgress ? options.onProgress : function(o) {};
		this.progressReport_ = { errors: [] };

		const lastContext = options.context ? options.context : {};

		const syncTargetId = this.api().syncTargetId();

		this.cancelling_ = false;

		// ------------------------------------------------------------------------
		// First, find all the items that have been changed since the
		// last sync and apply the changes to remote.
		// ------------------------------------------------------------------------

		let synchronizationId = time.unixMs().toString();

		let outputContext = Object.assign({}, lastContext);
		
		this.dispatch({ type: 'SYNC_STARTED' });

		this.logSyncOperation('starting', null, null, 'Starting synchronisation to target ' + syncTargetId + '... [' + synchronizationId + ']');

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
							// "itemConflict" if for all the items except the notes, which are dealt with in a special way
							action = local.type_ == BaseModel.TYPE_NOTE ? 'noteConflict' : 'itemConflict';
							reason = 'remote has been deleted, but local has changes';
						}
					} else {
						if (remote.updated_time > local.sync_time) {
							// Since, in this loop, we are only dealing with items that require sync, if the
							// remote has been modified after the sync time, it means both items have been
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
						// TODO: handle node and mobile in the same way
						if (shim.isNode()) {
							let resourceContent = '';
							try {
								resourceContent = await Resource.content(local);
							} catch (error) {
								error.message = 'Cannot read resource content: ' + local.id + ': ' + error.message;
								this.logger().error(error);
								this.progressReport_.errors.push(error);
							}
							await this.api().put(remoteContentPath, resourceContent);
						} else {
							const localResourceContentPath = Resource.fullPath(local);
							await this.api().put(remoteContentPath, null, { path: localResourceContentPath, source: 'file' });
						}
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
						await this.api().setTimestamp(path, local.updated_time);
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

						// ------------------------------------------------------------------------------
						// First find out if the conflict matters. For example, if the conflict is on the title or body
						// we want to preserve all the changes. If it's on todo_completed it doesn't really matter
						// so in this case we just take the remote content.
						// ------------------------------------------------------------------------------

						let loadedRemote = null;
						let mustHandleConflict = true;
						if (remote) {
							const remoteContent = await this.api().get(path);
							loadedRemote = await BaseItem.unserialize(remoteContent);
							mustHandleConflict = Note.mustHandleConflict(local, loadedRemote);
						}

						// ------------------------------------------------------------------------------
						// Create a duplicate of local note into Conflicts folder
						// (to preserve the user's changes)
						// ------------------------------------------------------------------------------

						if (mustHandleConflict) {
							let conflictedNote = Object.assign({}, local);
							delete conflictedNote.id;
							conflictedNote.is_conflict = 1;
							await Note.save(conflictedNote, { autoTimestamp: false });
						}

						// ------------------------------------------------------------------------------
						// Either copy the remote content to local or, if the remote content has
						// been deleted, delete the local content.
						// ------------------------------------------------------------------------------

						if (remote) {
							local = loadedRemote;
							const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
							await ItemClass.save(local, { autoTimestamp: false, nextQueries: syncTimeQueries });
						} else {
							// Remote no longer exists (note deleted) so delete local one too
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

			let deletedItems = await BaseItem.deletedItems(syncTargetId);
			for (let i = 0; i < deletedItems.length; i++) {
				if (this.cancelling()) break;

				let item = deletedItems[i];
				let path = BaseItem.systemPath(item.item_id)
				this.logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
				await this.api().delete(path);
				await BaseItem.remoteDeletedItem(syncTargetId, item.item_id);
			}

			// ------------------------------------------------------------------------
			// Loop through all the remote items, find those that
			// have been updated, and apply the changes to local.
			// ------------------------------------------------------------------------

			// At this point all the local items that have changed have been pushed to remote
			// or handled as conflicts, so no conflict is possible after this.

			let context = null;
			let newDeltaContext = null;
			let localFoldersToDelete = [];
			if (lastContext.delta) context = lastContext.delta;

			while (true) {
				if (this.cancelling()) break;

				let listResult = await this.api().delta('', {
					context: context,

					// allItemIdsHandler() provides a way for drivers that don't have a delta API to
					// still provide delta functionality by comparing the items they have to the items
					// the client has. Very inefficient but that's the only possible workaround.
					// It's a function so that it is only called if the driver needs these IDs. For
					// drivers with a delta functionality it's a noop.
					allItemIdsHandler: async () => { return BaseItem.syncedItemIds(syncTargetId); }
				});

				let remotes = listResult.items;
				for (let i = 0; i < remotes.length; i++) {
					if (this.cancelling()) break;

					let remote = remotes[i];
					if (!BaseItem.isSystemPath(remote.path)) continue; // The delta API might return things like the .sync, .resource or the root folder

					let path = remote.path;
					let action = null;
					let reason = '';
					let local = await BaseItem.loadItemByPath(path);
					if (!local) {
						if (!remote.isDeleted) {
							action = 'createLocal';
							reason = 'remote exists but local does not';
						}
					} else {
						if (remote.isDeleted) {
							action = 'deleteLocal';
							reason = 'remote has been deleted';
						} else {
							if (remote.updated_time > local.updated_time) {
								action = 'updateLocal';
								reason = 'remote is more recent than local';
							}
						}
					}

					if (!action) continue;

					this.logSyncOperation(action, local, remote, reason);

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
							nextQueries: BaseItem.updateSyncTimeQueries(syncTargetId, newContent, time.unixMs()),
						};
						if (action == 'createLocal') options.isNew = true;

						if (newContent.type_ == BaseModel.TYPE_RESOURCE && action == 'createLocal') {
							let localResourceContentPath = Resource.fullPath(newContent);
							let remoteResourceContentPath = this.resourceDirName_ + '/' + newContent.id;
							await this.api().get(remoteResourceContentPath, { path: localResourceContentPath, target: 'file' });
						}

						if (!newContent.user_updated_time) newContent.user_updated_time = newContent.updated_time;
						if (!newContent.user_created_time) newContent.user_created_time = newContent.created_time;

						await ItemClass.save(newContent, options);

					} else if (action == 'deleteLocal') {

						if (local.type_ == BaseModel.TYPE_FOLDER) {
							localFoldersToDelete.push(local);
							continue;
						}

						let ItemClass = BaseItem.itemClass(local.type_);
						await ItemClass.delete(local.id, { trackDeleted: false });

					}
				}

				if (!listResult.hasMore) {
					newDeltaContext = listResult.context;
					break;
				}
				context = listResult.context;
			}

			outputContext.delta = newDeltaContext ? newDeltaContext : lastContext.delta;

			// ------------------------------------------------------------------------
			// Delete the folders that have been collected in the loop above.
			// Folders are always deleted last, and only if they are empty.
			// If they are not empty it's considered a conflict since whatever deleted
			// them should have deleted their content too. In that case, all its notes
			// are marked as "is_conflict".
			// ------------------------------------------------------------------------

			if (!this.cancelling()) {
				for (let i = 0; i < localFoldersToDelete.length; i++) {
					const item = localFoldersToDelete[i];
					const noteIds = await Folder.noteIds(item.id);
					if (noteIds.length) { // CONFLICT
						await Folder.markNotesAsConflict(item.id);
					}
					await Folder.delete(item.id, { deleteChildren: false });
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
			this.logger().info('Synchronisation was cancelled.');
			this.cancelling_ = false;
		}

		this.progressReport_.completedTime = time.unixMs();

		this.logSyncOperation('finished', null, null, 'Synchronisation finished [' + synchronizationId + ']');

		await this.logSyncSummary(this.progressReport_);

		this.onProgress_ = function(s) {};
		this.progressReport_ = {};

		this.dispatch({ type: 'SYNC_COMPLETED' });

		this.state_ = 'idle';

		return outputContext;
	}

}

module.exports = { Synchronizer };