const BaseItem = require('lib/models/BaseItem.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const ItemChange = require('lib/models/ItemChange.js');
const Setting = require('lib/models/Setting.js');
const ResourceLocalState = require('lib/models/ResourceLocalState.js');
const MasterKey = require('lib/models/MasterKey.js');
const BaseModel = require('lib/BaseModel.js');
const { sprintf } = require('sprintf-js');
const { time } = require('lib/time-utils.js');
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim.js');
const { filename } = require('lib/path-utils');
const JoplinError = require('lib/JoplinError');
const BaseSyncTarget = require('lib/BaseSyncTarget');
const TaskQueue = require('lib/TaskQueue');

class Synchronizer {
	constructor(db, api, appType) {
		this.state_ = 'idle';
		this.db_ = db;
		this.api_ = api;
		this.syncDirName_ = '.sync';
		this.lockDirName_ = '.lock';
		this.resourceDirName_ = BaseSyncTarget.resourceDirName();
		this.logger_ = new Logger();
		this.appType_ = appType;
		this.cancelling_ = false;
		this.autoStartDecryptionWorker_ = true;
		this.maxResourceSize_ = null;
		this.downloadQueue_ = null;
		this.clientId_ = Setting.value('clientId');

		// Debug flags are used to test certain hard-to-test conditions
		// such as cancelling in the middle of a loop.
		this.testingHooks_ = [];

		this.onProgress_ = function() {};
		this.progressReport_ = {};

		this.dispatch = function() {};
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

	clientId() {
		return this.clientId_;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	maxResourceSize() {
		if (this.maxResourceSize_ !== null) return this.maxResourceSize_;
		return this.appType_ === 'mobile' ? 10 * 1000 * 1000 : Infinity;
	}

	setEncryptionService(v) {
		this.encryptionService_ = v;
	}

	encryptionService() {
		return this.encryptionService_;
	}

	async waitForSyncToFinish() {
		if (this.state() === 'idle') return;

		while (true) {
			await time.sleep(1);
			if (this.state() === 'idle') return;
		}
	}

	static reportToLines(report) {
		let lines = [];
		if (report.createLocal) lines.push(_('Created local items: %d.', report.createLocal));
		if (report.updateLocal) lines.push(_('Updated local items: %d.', report.updateLocal));
		if (report.createRemote) lines.push(_('Created remote items: %d.', report.createRemote));
		if (report.updateRemote) lines.push(_('Updated remote items: %d.', report.updateRemote));
		if (report.deleteLocal) lines.push(_('Deleted local items: %d.', report.deleteLocal));
		if (report.deleteRemote) lines.push(_('Deleted remote items: %d.', report.deleteRemote));
		if (report.fetchingTotal && report.fetchingProcessed) lines.push(_('Fetched items: %d/%d.', report.fetchingProcessed, report.fetchingTotal));
		// if (!report.completedTime && report.state) lines.push(_('State: %s.', Synchronizer.stateToLabel(report.state)));
		if (report.cancelling && !report.completedTime) lines.push(_('Cancelling...'));
		if (report.completedTime) lines.push(_('Completed: %s', time.formatMsToLocal(report.completedTime)));
		if (report.errors && report.errors.length) lines.push(_('Last error: %s', report.errors[report.errors.length - 1].toString().substr(0, 500)));

		return lines;
	}

	logSyncOperation(action, local = null, remote = null, message = null, actionCount = 1) {
		let line = ['Sync'];
		line.push(action);
		if (message) line.push(message);

		let type = local && local.type_ ? local.type_ : null;
		if (!type) type = remote && remote.type_ ? remote.type_ : null;

		if (type) line.push(BaseItem.modelTypeToClassName(type));

		if (local) {
			let s = [];
			s.push(local.id);
			line.push(`(Local ${s.join(', ')})`);
		}

		if (remote) {
			let s = [];
			s.push(remote.id ? remote.id : remote.path);
			line.push(`(Remote ${s.join(', ')})`);
		}

		this.logger().debug(line.join(': '));

		if (!this.progressReport_[action]) this.progressReport_[action] = 0;
		this.progressReport_[action] += actionCount;
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
			this.logger().info(`${n}: ${report[n] ? report[n] : '-'}`);
		}
		let folderCount = await Folder.count();
		let noteCount = await Note.count();
		let resourceCount = await Resource.count();
		this.logger().info(`Total folders: ${folderCount}`);
		this.logger().info(`Total notes: ${noteCount}`);
		this.logger().info(`Total resources: ${resourceCount}`);

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

		// Stop queue but don't set it to null as it may be used to
		// retrieve the last few downloads.
		if (this.downloadQueue_) this.downloadQueue_.stop();

		this.logSyncOperation('cancelling', null, null, '');
		this.cancelling_ = true;

		return new Promise((resolve) => {
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

	logLastRequests() {
		const lastRequests = this.api().lastRequests();
		if (!lastRequests || !lastRequests.length) return;

		for (const r of lastRequests) {
			const timestamp = time.unixMsToLocalHms(r.timestamp);
			this.logger().info(`Req ${timestamp}: ${r.request}`);
			this.logger().info(`Res ${timestamp}: ${r.response}`);
		}
	}

	static stateToLabel(state) {
		if (state === 'idle') return _('Idle');
		if (state === 'in_progress') return _('In progress');
		return state;
	}

	async acquireLock_() {
		await this.checkLock_();
		await this.api().put(`${this.lockDirName_}/${this.clientId()}_${Date.now()}.lock`, `${Date.now()}`);
	}

	async releaseLock_() {
		const lockFiles = await this.lockFiles_();
		for (const lockFile of lockFiles) {
			const p = this.parseLockFilePath(lockFile.path);
			if (p.clientId === this.clientId()) {
				await this.api().delete(p.fullPath);
			}
		}
	}

	async lockFiles_() {
		const output = await this.api().list(this.lockDirName_);
		return output.items;
	}

	parseLockFilePath(path) {
		const splitted = filename(path).split('_');
		const fullPath = `${this.lockDirName_}/${path}`;
		if (splitted.length !== 2) throw new Error(`Sync target appears to be locked but lock filename is invalid: ${fullPath}. Please delete it on the sync target to continue.`);
		return {
			clientId: splitted[0],
			timestamp: Number(splitted[1]),
			fullPath: fullPath,
		};
	}

	async checkLock_() {
		const lockFiles = await this.lockFiles_();
		if (lockFiles.length) {
			const lock = this.parseLockFilePath(lockFiles[0].path);

			if (lock.clientId === this.clientId()) {
				await this.releaseLock_();
			} else {
				throw new Error(`The sync target was locked by client ${lock.clientId} on ${time.unixMsToLocalDateTime(lock.timestamp)} and cannot be accessed. If no app is currently operating on the sync target, you can delete the files in the "${this.lockDirName_}" directory on the sync target to resume.`);
			}
		}
	}

	async checkSyncTargetVersion_() {
		const supportedSyncTargetVersion = Setting.value('syncVersion');
		const syncTargetVersion = await this.api().get('.sync/version.txt');

		if (!syncTargetVersion) {
			await this.api().put('.sync/version.txt', `${supportedSyncTargetVersion}`);
		} else {
			if (Number(syncTargetVersion) > supportedSyncTargetVersion) {
				throw new Error(sprintf('Sync version of the target (%d) does not match sync version supported by client (%d). Please upgrade your client.', Number(syncTargetVersion), supportedSyncTargetVersion));
			} else {
				await this.api().put('.sync/version.txt', `${supportedSyncTargetVersion}`);
				// TODO: do upgrade job
			}
		}
	}

	// Synchronisation is done in three major steps:
	//
	// 1. UPLOAD: Send to the sync target the items that have changed since the last sync.
	// 2. DELETE_REMOTE: Delete on the sync target, the items that have been deleted locally.
	// 3. DELTA: Find on the sync target the items that have been modified or deleted and apply the changes locally.
	async start(options = null) {
		if (!options) options = {};

		if (this.state() != 'idle') {
			let error = new Error(sprintf('Synchronisation is already in progress. State: %s', this.state()));
			error.code = 'alreadyStarted';
			throw error;
		}

		this.state_ = 'in_progress';

		this.onProgress_ = options.onProgress ? options.onProgress : function() {};
		this.progressReport_ = { errors: [] };

		const lastContext = options.context ? options.context : {};

		const syncSteps = options.syncSteps ? options.syncSteps : ['update_remote', 'delete_remote', 'delta'];

		// The default is to log errors, but when testing it's convenient to be able to catch and verify errors
		const throwOnError = options.throwOnError === true;

		const syncTargetId = this.api().syncTargetId();

		this.cancelling_ = false;

		const masterKeysBefore = await MasterKey.count();
		let hasAutoEnabledEncryption = false;

		let synchronizationId = time.unixMs().toString();

		let outputContext = Object.assign({}, lastContext);

		this.dispatch({ type: 'SYNC_STARTED' });

		this.logSyncOperation('starting', null, null, `Starting synchronisation to target ${syncTargetId}... [${synchronizationId}]`);

		const handleCannotSyncItem = async (ItemClass, syncTargetId, item, cannotSyncReason, itemLocation = null) => {
			await ItemClass.saveSyncDisabled(syncTargetId, item, cannotSyncReason, itemLocation);
			this.dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
		};

		const resourceRemotePath = resourceId => {
			return `${this.resourceDirName_}/${resourceId}`;
		};

		let errorToThrow = null;

		try {
			await this.api().mkdir(this.syncDirName_);
			await this.api().mkdir(this.lockDirName_);
			this.api().setTempDirName(this.syncDirName_);
			await this.api().mkdir(this.resourceDirName_);

			await this.checkLock_();
			await this.checkSyncTargetVersion_();

			// ========================================================================
			// 1. UPLOAD
			// ------------------------------------------------------------------------
			// First, find all the items that have been changed since the
			// last sync and apply the changes to remote.
			// ========================================================================

			if (syncSteps.indexOf('update_remote') >= 0) {
				let donePaths = [];

				const completeItemProcessing = path => {
					donePaths.push(path);
				};

				while (true) {
					if (this.cancelling()) break;

					let result = await BaseItem.itemsThatNeedSync(syncTargetId);
					let locals = result.items;

					for (let i = 0; i < locals.length; i++) {
						if (this.cancelling()) break;

						let local = locals[i];
						let ItemClass = BaseItem.itemClass(local);
						let path = BaseItem.systemPath(local);

						// Safety check to avoid infinite loops.
						// - In fact this error is possible if the item is marked for sync (via sync_time or force_sync) while synchronisation is in
						//   progress. In that case exit anyway to be sure we aren't in a loop and the item will be re-synced next time.
						// - It can also happen if the item is directly modified in the sync target, and set with an update_time in the future. In that case,
						//   the local sync_time will be updated to Date.now() but on the next loop it will see that the remote item still has a date ahead
						//   and will see a conflict. There's currently no automatic fix for this - the remote item on the sync target must be fixed manually
						//   (by setting an updated_time less than current time).
						if (donePaths.indexOf(path) >= 0) throw new JoplinError(sprintf('Processing a path that has already been done: %s. sync_time was not updated? Remote item has an updated_time in the future?', path), 'processingPathTwice');

						let remote = await this.api().stat(path);
						let action = null;

						let reason = '';
						let remoteContent = null;

						if (!remote) {
							if (!local.sync_time) {
								action = 'createRemote';
								reason = 'remote does not exist, and local is new and has never been synced';
							} else {
								// Note or item was modified after having been deleted remotely
								// "itemConflict" is for all the items except the notes, which are dealt with in a special way
								action = local.type_ == BaseModel.TYPE_NOTE ? 'noteConflict' : 'itemConflict';
								reason = 'remote has been deleted, but local has changes';
							}
						} else {
							// Note: in order to know the real updated_time value, we need to load the content. In theory we could
							// rely on the file timestamp (in remote.updated_time) but in practice it's not accurate enough and
							// can lead to conflicts (for example when the file timestamp is slightly ahead of it's real
							// updated_time). updated_time is set and managed by clients so it's always accurate.
							// Same situation below for updateLocal.
							//
							// This is a bit inefficient because if the resulting action is "updateRemote" we don't need the whole
							// content, but for now that will do since being reliable is the priority.
							//
							// Note: assuming a particular sync target is guaranteed to have accurate timestamps, the driver maybe
							// could expose this with a accurateTimestamps() method that returns "true". In that case, the test
							// could be done using the file timestamp and the potentially unnecessary content loading could be skipped.
							// OneDrive does not appear to have accurate timestamps as lastModifiedDateTime would occasionally be
							// a few seconds ahead of what it was set with setTimestamp()
							try {
								remoteContent = await this.api().get(path);
							} catch (error) {
								if (error.code === 'rejectedByTarget') {
									this.progressReport_.errors.push(error);
									this.logger().warn(`Rejected by target: ${path}: ${error.message}`);
									completeItemProcessing(path);
									continue;
								} else {
									throw error;
								}
							}
							if (!remoteContent) throw new Error(`Got metadata for path but could not fetch content: ${path}`);
							remoteContent = await BaseItem.unserialize(remoteContent);

							if (remoteContent.updated_time > local.sync_time) {
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

						if (local.type_ == BaseModel.TYPE_RESOURCE && (action == 'createRemote' || action === 'updateRemote' || (action == 'itemConflict' && remote))) {
							const localState = await Resource.localState(local.id);
							if (localState.fetch_status !== Resource.FETCH_STATUS_DONE) {
								action = null;
							} else {
								try {
									const remoteContentPath = resourceRemotePath(local.id);
									const result = await Resource.fullPathForSyncUpload(local);
									local = result.resource;
									const localResourceContentPath = result.path;

									if (local.size >= 10 * 1000* 1000) {
										this.logger().warn(`Uploading a large resource (resourceId: ${local.id}, size:${local.size} bytes) which may tie up the sync process.`);
									}

									await this.api().put(remoteContentPath, null, { path: localResourceContentPath, source: 'file' });
								} catch (error) {
									if (error && ['rejectedByTarget', 'fileNotFound'].indexOf(error.code) >= 0) {
										await handleCannotSyncItem(ItemClass, syncTargetId, local, error.message);
										action = null;
									} else {
										throw error;
									}
								}
							}
						}

						if (action == 'createRemote' || action == 'updateRemote') {
							let canSync = true;
							try {
								if (this.testingHooks_.indexOf('notesRejectedByTarget') >= 0 && local.type_ === BaseModel.TYPE_NOTE) throw new JoplinError('Testing rejectedByTarget', 'rejectedByTarget');
								const content = await ItemClass.serializeForSync(local);
								await this.api().put(path, content);
							} catch (error) {
								if (error && error.code === 'rejectedByTarget') {
									await handleCannotSyncItem(ItemClass, syncTargetId, local, error.message);
									canSync = false;
								} else {
									throw error;
								}
							}

							// Note: Currently, we set sync_time to update_time, which should work fine given that the resolution is the millisecond.
							// In theory though, this could happen:
							//
							// 1. t0: Editor: Note is modified
							// 2. t0: Sync: Found that note was modified so start uploading it
							// 3. t0: Editor: Note is modified again
							// 4. t1: Sync: Note has finished uploading, set sync_time to t0
							//
							// Later any attempt to sync will not detect that note was modified in (3) (within the same millisecond as it was being uploaded)
							// because sync_time will be t0 too.
							//
							// The solution would be to use something like an etag (a simple counter incremented on every change) to make sure each
							// change is uniquely identified. Leaving it like this for now.

							if (canSync) {
								// 2018-01-21: Setting timestamp is not needed because the delta() logic doesn't rely
								// on it (instead it uses a more reliable `context` object) and the itemsThatNeedSync loop
								// above also doesn't use it because it fetches the whole remote object and read the
								// more reliable 'updated_time' property. Basically remote.updated_time is deprecated.

								// await this.api().setTimestamp(path, local.updated_time);
								await ItemClass.saveSyncTime(syncTargetId, local, local.updated_time);
							}
						} else if (action == 'itemConflict') {
							// ------------------------------------------------------------------------------
							// For non-note conflicts, we take the remote version (i.e. the version that was
							// synced first) and overwrite the local content.
							// ------------------------------------------------------------------------------

							if (remote) {
								local = remoteContent;

								const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
								await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });
							} else {
								await ItemClass.delete(local.id, { changeSource: ItemChange.SOURCE_SYNC });
							}
						} else if (action == 'noteConflict') {
							// ------------------------------------------------------------------------------
							// First find out if the conflict matters. For example, if the conflict is on the title or body
							// we want to preserve all the changes. If it's on todo_completed it doesn't really matter
							// so in this case we just take the remote content.
							// ------------------------------------------------------------------------------

							let mustHandleConflict = true;
							if (remoteContent) {
								mustHandleConflict = Note.mustHandleConflict(local, remoteContent);
							}

							// ------------------------------------------------------------------------------
							// Create a duplicate of local note into Conflicts folder
							// (to preserve the user's changes)
							// ------------------------------------------------------------------------------

							if (mustHandleConflict) {
								let conflictedNote = Object.assign({}, local);
								delete conflictedNote.id;
								conflictedNote.is_conflict = 1;
								await Note.save(conflictedNote, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC });
							}

							// ------------------------------------------------------------------------------
							// Either copy the remote content to local or, if the remote content has
							// been deleted, delete the local content.
							// ------------------------------------------------------------------------------

							if (remote) {
								local = remoteContent;
								const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
								await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });

								if (local.encryption_applied) this.dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
							} else {
								// Remote no longer exists (note deleted) so delete local one too
								await ItemClass.delete(local.id, { changeSource: ItemChange.SOURCE_SYNC });
							}
						}

						completeItemProcessing(path);
					}

					if (!result.hasMore) break;
				}
			} // UPLOAD STEP

			// ========================================================================
			// 2. DELETE_REMOTE
			// ------------------------------------------------------------------------
			// Delete the remote items that have been deleted locally.
			// ========================================================================

			if (syncSteps.indexOf('delete_remote') >= 0) {
				let deletedItems = await BaseItem.deletedItems(syncTargetId);
				for (let i = 0; i < deletedItems.length; i++) {
					if (this.cancelling()) break;

					let item = deletedItems[i];
					let path = BaseItem.systemPath(item.item_id);
					this.logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
					await this.api().delete(path);

					if (item.item_type === BaseModel.TYPE_RESOURCE) {
						const remoteContentPath = resourceRemotePath(item.item_id);
						await this.api().delete(remoteContentPath);
					}

					await BaseItem.remoteDeletedItem(syncTargetId, item.item_id);
				}
			} // DELETE_REMOTE STEP

			// ------------------------------------------------------------------------
			// 3. DELTA
			// ------------------------------------------------------------------------
			// Loop through all the remote items, find those that
			// have been created or updated, and apply the changes to local.
			// ------------------------------------------------------------------------

			if (this.downloadQueue_) await this.downloadQueue_.stop();
			this.downloadQueue_ = new TaskQueue('syncDownload');
			this.downloadQueue_.logger_ = this.logger();

			if (syncSteps.indexOf('delta') >= 0) {
				// At this point all the local items that have changed have been pushed to remote
				// or handled as conflicts, so no conflict is possible after this.

				let context = null;
				let newDeltaContext = null;
				let localFoldersToDelete = [];
				let hasCancelled = false;
				if (lastContext.delta) context = lastContext.delta;

				while (true) {
					if (this.cancelling() || hasCancelled) break;

					let listResult = await this.api().delta('', {
						context: context,

						// allItemIdsHandler() provides a way for drivers that don't have a delta API to
						// still provide delta functionality by comparing the items they have to the items
						// the client has. Very inefficient but that's the only possible workaround.
						// It's a function so that it is only called if the driver needs these IDs. For
						// drivers with a delta functionality it's a noop.
						allItemIdsHandler: async () => {
							return BaseItem.syncedItemIds(syncTargetId);
						},

						wipeOutFailSafe: Setting.value('sync.wipeOutFailSafe'),

						logger: this.logger(),
					});

					let remotes = listResult.items;

					this.logSyncOperation('fetchingTotal', null, null, 'Fetching delta items from sync target', remotes.length);

					for (const remote of remotes) {
						if (this.cancelling()) break;

						this.downloadQueue_.push(remote.path, async () => {
							return this.api().get(remote.path);
						});
					}

					for (let i = 0; i < remotes.length; i++) {
						if (this.cancelling() || this.testingHooks_.indexOf('cancelDeltaLoop2') >= 0) {
							hasCancelled = true;
							break;
						}

						this.logSyncOperation('fetchingProcessed', null, null, 'Processing fetched item');

						let remote = remotes[i];
						if (!BaseItem.isSystemPath(remote.path)) continue; // The delta API might return things like the .sync, .resource or the root folder

						const loadContent = async () => {
							let task = await this.downloadQueue_.waitForResult(path); // await this.api().get(path);
							if (task.error) throw task.error;
							if (!task.result) return null;
							return await BaseItem.unserialize(task.result);
						};

						let path = remote.path;
						let action = null;
						let reason = '';
						let local = await BaseItem.loadItemByPath(path);
						let ItemClass = null;
						let content = null;

						try {
							if (!local) {
								if (remote.isDeleted !== true) {
									action = 'createLocal';
									reason = 'remote exists but local does not';
									content = await loadContent();
									ItemClass = content ? BaseItem.itemClass(content) : null;
								}
							} else {
								ItemClass = BaseItem.itemClass(local);
								local = ItemClass.filter(local);
								if (remote.isDeleted) {
									action = 'deleteLocal';
									reason = 'remote has been deleted';
								} else {
									content = await loadContent();
									if (content && content.updated_time > local.updated_time) {
										action = 'updateLocal';
										reason = 'remote is more recent than local';
									}
								}
							}
						} catch (error) {
							if (error.code === 'rejectedByTarget') {
								this.progressReport_.errors.push(error);
								this.logger().warn(`Rejected by target: ${path}: ${error.message}`);
								action = null;
							} else {
								error.message = `On file ${path}: ${error.message}`;
								throw error;
							}
						}

						if (this.testingHooks_.indexOf('skipRevisions') >= 0 && content && content.type_ === BaseModel.TYPE_REVISION) action = null;

						if (!action) continue;

						this.logSyncOperation(action, local, remote, reason);

						if (action == 'createLocal' || action == 'updateLocal') {
							if (content === null) {
								this.logger().warn(`Remote has been deleted between now and the delta() call? In that case it will be handled during the next sync: ${path}`);
								continue;
							}
							content = ItemClass.filter(content);

							// 2017-12-03: This was added because the new user_updated_time and user_created_time properties were added
							// to the items. However changing the database is not enough since remote items that haven't been synced yet
							// will not have these properties and, since they are required, it would cause a problem. So this check
							// if they are present and, if not, set them to a reasonable default.
							// Let's leave these two lines for 6 months, by which time all the clients should have been synced.
							if (!content.user_updated_time) content.user_updated_time = content.updated_time;
							if (!content.user_created_time) content.user_created_time = content.created_time;

							let options = {
								autoTimestamp: false,
								nextQueries: BaseItem.updateSyncTimeQueries(syncTargetId, content, time.unixMs()),
								changeSource: ItemChange.SOURCE_SYNC,
							};
							if (action == 'createLocal') options.isNew = true;
							if (action == 'updateLocal') options.oldItem = local;

							const creatingNewResource = content.type_ == BaseModel.TYPE_RESOURCE && action == 'createLocal';

							if (creatingNewResource) {
								if (content.size >= this.maxResourceSize()) {
									await handleCannotSyncItem(ItemClass, syncTargetId, content, `File "${content.title}" is larger than allowed ${this.maxResourceSize()} bytes. Beyond this limit, the mobile app would crash.`, BaseItem.SYNC_ITEM_LOCATION_REMOTE);
									continue;
								}

								await ResourceLocalState.save({ resource_id: content.id, fetch_status: Resource.FETCH_STATUS_IDLE });
							}

							await ItemClass.save(content, options);

							if (creatingNewResource) this.dispatch({ type: 'SYNC_CREATED_RESOURCE', id: content.id });

							if (!hasAutoEnabledEncryption && content.type_ === BaseModel.TYPE_MASTER_KEY && !masterKeysBefore) {
								hasAutoEnabledEncryption = true;
								this.logger().info('One master key was downloaded and none was previously available: automatically enabling encryption');
								this.logger().info('Using master key: ', content.id);
								await this.encryptionService().enableEncryption(content);
								await this.encryptionService().loadMasterKeysFromSettings();
								this.logger().info('Encryption has been enabled with downloaded master key as active key. However, note that no password was initially supplied. It will need to be provided by user.');
							}

							if (content.encryption_applied) this.dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
						} else if (action == 'deleteLocal') {
							if (local.type_ == BaseModel.TYPE_FOLDER) {
								localFoldersToDelete.push(local);
								continue;
							}

							let ItemClass = BaseItem.itemClass(local.type_);
							await ItemClass.delete(local.id, { trackDeleted: false, changeSource: ItemChange.SOURCE_SYNC });
						}
					}

					// If user has cancelled, don't record the new context (2) so that synchronisation
					// can start again from the previous context (1) next time. It is ok if some items
					// have been synced between (1) and (2) because the loop above will handle the same
					// items being synced twice as an update. If the local and remote items are identical
					// the update will simply be skipped.
					if (!hasCancelled) {
						if (options.saveContextHandler) {
							const deltaToSave = Object.assign({}, listResult.context);
							// Remove these two variables because they can be large and can be rebuilt
							// the next time the sync is started.
							delete deltaToSave.statsCache;
							delete deltaToSave.statIdsCache;
							options.saveContextHandler({ delta: deltaToSave });
						}

						if (!listResult.hasMore) {
							newDeltaContext = listResult.context;
							break;
						}
						context = listResult.context;
					}
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
						if (noteIds.length) {
							// CONFLICT
							await Folder.markNotesAsConflict(item.id);
						}
						await Folder.delete(item.id, { deleteChildren: false, changeSource: ItemChange.SOURCE_SYNC, trackDeleted: false });
					}
				}

				if (!this.cancelling()) {
					await BaseItem.deleteOrphanSyncItems();
				}
			} // DELTA STEP
		} catch (error) {
			if (throwOnError) {
				errorToThrow = error;
			} else if (error && ['cannotEncryptEncrypted', 'noActiveMasterKey', 'processingPathTwice', 'failSafe'].indexOf(error.code) >= 0) {
				// Only log an info statement for this since this is a common condition that is reported
				// in the application, and needs to be resolved by the user.
				// Or it's a temporary issue that will be resolved on next sync.
				this.logger().info(error.message);

				if (error.code === 'failSafe') {
					// Get the message to display on UI, but not in testing to avoid poluting stdout
					if (!shim.isTestingEnv()) this.progressReport_.errors.push(error.message);
					this.logLastRequests();
				}
			} else if (error.code === 'unknownItemType') {
				this.progressReport_.errors.push(_('Unknown item type downloaded - please upgrade Joplin to the latest version'));
				this.logger().error(error);
			} else {
				this.logger().error(error);

				// Don't save to the report errors that are due to things like temporary network errors or timeout.
				if (!shim.fetchRequestCanBeRetried(error)) {
					this.progressReport_.errors.push(error);
					this.logLastRequests();
				}
			}
		}

		if (this.cancelling()) {
			this.logger().info('Synchronisation was cancelled.');
			this.cancelling_ = false;
		}

		this.progressReport_.completedTime = time.unixMs();

		this.logSyncOperation('finished', null, null, `Synchronisation finished [${synchronizationId}]`);

		await this.logSyncSummary(this.progressReport_);

		this.onProgress_ = function() {};
		this.progressReport_ = {};

		this.dispatch({ type: 'SYNC_COMPLETED' });

		this.state_ = 'idle';

		if (errorToThrow) throw errorToThrow;

		return outputContext;
	}
}

module.exports = { Synchronizer };
