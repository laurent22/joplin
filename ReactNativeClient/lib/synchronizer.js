import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Resource } from 'lib/models/resource.js';
import { BaseModel } from 'lib/base-model.js';
import { sprintf } from 'sprintf-js';
import { time } from 'lib/time-utils.js';
import { Logger } from 'lib/logger.js'
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

		if (report.errors.length) {
			this.logger().warn('There was some errors:');
			for (let i = 0; i < report.errors.length; i++) {
				let e = report.errors[i];
				//let msg = JSON.stringify(e); //e && e.message ? e.message : JSON.stringify(e);
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
		
		this.logger().info('Cancelling synchronization...');
		this.cancelling_ = true;
	}

	cancelling() {
		return this.cancelling_;
	}

	async start(options = null) {
		if (!options) options = {};
		if (!options.onProgress) options.onProgress = function(o) {};

		if (this.state() != 'idle') {
			this.logger().warn('Synchronization is already in progress. State: ' + this.state());
			return;
		}	

		this.randomFailureChoice_ = Math.floor(Math.random() * 5);
		this.cancelling_ = false;

		// ------------------------------------------------------------------------
		// First, find all the items that have been changed since the
		// last sync and apply the changes to remote.
		// ------------------------------------------------------------------------

		let synchronizationId = time.unixMs().toString();
		this.logger().info('Starting synchronization... [' + synchronizationId + ']');

		this.state_ = 'started';

		let report = {
			remotesToUpdate: 0,
			remotesToDelete: 0,
			localsToUdpate: 0,
			localsToDelete: 0,

			createLocal: 0,
			updateLocal: 0,
			deleteLocal: 0,
			createRemote: 0,
			updateRemote: 0,
			deleteRemote: 0,
			itemConflict: 0,
			noteConflict: 0,

			state: this.state(),
			errors: [],
		};

		try {
			await this.api().mkdir(this.syncDirName_);
			await this.api().mkdir(this.resourceDirName_);			

			let donePaths = [];
			while (true) {
				if (this.cancelling()) break;

				let result = await BaseItem.itemsThatNeedSync();
				let locals = result.items;

				report.remotesToUpdate += locals.length;
				options.onProgress(report);

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
						let tempPath = this.syncDirName_ + '/' + path + '_' + time.unixMs();
						
						await this.api().put(tempPath, content);
						await this.api().setTimestamp(tempPath, local.updated_time);
						await this.api().move(tempPath, path);

						if (this.randomFailure(options, 0)) return;
						
						await ItemClass.save({ id: local.id, sync_time: time.unixMs(), type_: local.type_ }, { autoTimestamp: false });

					} else if (action == 'itemConflict') {

						if (remote) {
							let remoteContent = await this.api().get(path);
							local = await BaseItem.unserialize(remoteContent);

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

						if (this.randomFailure(options, 1)) return;

						if (remote) {
							let remoteContent = await this.api().get(path);
							local = await BaseItem.unserialize(remoteContent);

							local.sync_time = time.unixMs();
							await ItemClass.save(local, { autoTimestamp: false });
						} else {
							await ItemClass.delete(local.id);
						}

					}

					report[action]++;

					donePaths.push(path);

					options.onProgress(report);
				}

				if (!result.hasMore) break;
			}

			// ------------------------------------------------------------------------
			// Delete the remote items that have been deleted locally.
			// ------------------------------------------------------------------------

			let deletedItems = await BaseItem.deletedItems();
			report.remotesToDelete = deletedItems.length;
			options.onProgress(report);
			for (let i = 0; i < deletedItems.length; i++) {
				if (this.cancelling()) break;

				let item = deletedItems[i];
				let path = BaseItem.systemPath(item.item_id)
				this.logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
				await this.api().delete(path);
				if (this.randomFailure(options, 2)) return;
				await BaseItem.remoteDeletedItem(item.item_id);

				report['deleteRemote']++;
				options.onProgress(report);
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

					report.localsToUdpate++;
					options.onProgress(report);

					if (action == 'createLocal' || action == 'updateLocal') {
						let content = await this.api().get(path);
						if (content === null) {
							this.logger().warn('Remote has been deleted between now and the list() call? In that case it will be handled during the next sync: ' + path);
							continue;
						}
						content = await BaseItem.unserialize(content);
						let ItemClass = BaseItem.itemClass(content);

						let newContent = Object.assign({}, content);
						newContent.sync_time = time.unixMs();
						let options = {
							autoTimestamp: false,
							applyMetadataChanges: true,
						};
						if (action == 'createLocal') options.isNew = true;

						if (newContent.type_ == BaseModel.TYPE_RESOURCE && action == 'createLocal') {
							let localResourceContentPath = Resource.fullPath(newContent);
							let remoteResourceContentPath = this.resourceDirName_ + '/' + newContent.id;

							await this.api().get(remoteResourceContentPath, { path: localResourceContentPath, target: 'file' });
							
							// if (this.appType_ == 'cli') {								
							// 	let remoteResourceContent = await this.api().get(remoteResourceContentPath, { encoding: 'binary' });
							// 	await Resource.setContent(newContent, remoteResourceContent);
							// } else if (this.appType_ == 'mobile') {
							// 	await this.api().get(remoteResourceContentPath, { path: localResourceContentPath, target: 'file' });
							// } else {
							// 	throw new Error('Unknown appType: ' + this.appType_);
							// }
						}

						await ItemClass.save(newContent, options);

						this.logSyncOperation(action, local, content, reason);
					} else {
						this.logSyncOperation(action, local, remote, reason);
					}

					report[action]++;

					options.onProgress(report);
				}

				if (!listResult.hasMore) break;
				context = listResult.context;
			}

			// ------------------------------------------------------------------------
			// Search, among the local IDs, those that don't exist remotely, which
			// means the item has been deleted.
			// ------------------------------------------------------------------------

			if (this.randomFailure(options, 4)) return;

			if (!this.cancelling()) {
				let items = await BaseItem.syncedItems();
				for (let i = 0; i < items.length; i++) {
					if (this.cancelling()) break;

					let item = items[i];
					if (remoteIds.indexOf(item.id) < 0) {
						report.localsToDelete++;
						options.onProgress(report);
						this.logSyncOperation('deleteLocal', { id: item.id }, null, 'remote has been deleted');

						let ItemClass = BaseItem.itemClass(item);
						await ItemClass.delete(item.id, { trackDeleted: false });
						report['deleteLocal']++;
						options.onProgress(report);
					}
				}
			}
		} catch (error) {
			report.errors.push(error);
			this.logger().error(error);
		}

		if (this.cancelling()) {
			this.logger().info('Synchronization was cancelled.');
			this.cancelling_ = false;
		}

		this.logger().info('Synchronization complete [' + synchronizationId + ']:');
		await this.logSyncSummary(report);

		this.state_ = 'idle';

		report.state = this.state();
		options.onProgress(report);
	}

}

export { Synchronizer };