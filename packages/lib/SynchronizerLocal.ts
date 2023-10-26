import Logger from '@joplin/utils/Logger';
import { LockType } from './services/synchronizer/LockHandler';
import Setting, { AppType } from './models/Setting';
import shim from './shim';
import eventManager from './eventManager';
import { _ } from './locale';
import BaseItem from './models/BaseItem';
import Folder from './models/Folder';
import Resource from './models/Resource';
import ItemChange from './models/ItemChange';
import ResourceLocalState from './models/ResourceLocalState';
import MasterKey from './models/MasterKey';
import BaseModel, { ModelType } from './BaseModel';
import time from './time';
import JoplinError from './JoplinError';
import TaskQueue from './TaskQueue';
import ItemUploader from './services/synchronizer/ItemUploader';
import { FileApi, RemoteItem } from './file-api';
import JoplinDatabase from './JoplinDatabase';
import { fetchSyncInfo, getActiveMasterKey, localSyncInfo, mergeSyncInfos, saveLocalSyncInfo, setMasterKeyHasBeenUsed, syncInfoEquals, uploadSyncInfo } from './services/synchronizer/syncInfoUtils';
import { setupAndDisableEncryption, setupAndEnableEncryption } from './services/e2ee/utils';
import handleConflictAction, { ConflictAction } from './services/synchronizer/utils/handleConflictAction';
import resourceRemotePath from './services/synchronizer/utils/resourceRemotePath';
import { ErrorCode } from './errors';
import Synchronizer, { isCannotSyncError } from './Synchronizer';
import Note from './models/Note';
const { sprintf } = require('sprintf-js');
const { Dirnames } = require('./services/synchronizer/utils/types');

const logger = Logger.create('Synchronizer');

export default class SynchronizerLocal extends Synchronizer {

	public static verboseMode = true;

	public constructor(db: JoplinDatabase, api: FileApi, appType: AppType) {
		super(db, api, appType);
	}


	// Synchronisation is done in three major steps:
	//
	// 1. UPLOAD: Send to the sync target the items that have changed since the last sync.
	// 2. DELETE_REMOTE: Delete on the sync target, the items that have been deleted locally.
	// 3. DELTA: Find on the sync target the items that have been modified or deleted and apply the changes locally.
	public async start(options: any = null) {
		if (!options) options = {};

		if (this.state() !== 'idle') {
			const error: any = new Error(sprintf('Synchronisation is already in progress. State: %s', this.state()));
			error.code = 'alreadyStarted';
			throw error;
		}

		this.state_ = 'in_progress';

		this.onProgress_ = options.onProgress ? options.onProgress : function() { };
		this.progressReport_ = { errors: [] };

		const lastContext = options.context ? options.context : {};

		const syncSteps = options.syncSteps ? options.syncSteps : ['update_remote', 'delete_remote', 'delta'];

		// The default is to log errors, but when testing it's convenient to be able to catch and verify errors
		const throwOnError = options.throwOnError === true;

		const syncTargetId = this.api().syncTargetId();

		this.syncTargetIsLocked_ = false;
		this.cancelling_ = false;

		// const masterKeysBefore = await MasterKey.count();
		// let hasAutoEnabledEncryption = false;

		const synchronizationId = time.unixMs().toString();

		const outputContext = { ...lastContext };

		this.progressReport_.startTime = time.unixMs();

		// const id_folder_map = await (async (): Promise<Map<string, Folder>> => {
		// 	const localFolders = await BaseItem.loadItemsByType(BaseModel.TYPE_FOLDER);
		// 	const id_title_map = new Map<string, Folder>();
		// 	for (const f of localFolders) {
		// 		id_title_map.set(f.id, f);
		// 	}
		// 	return id_title_map;
		// })();

		const createDir = async (path: string) => {
			const pStat = await this.apiCall('stat', path);
			if (!pStat) await this.apiCall('mkdir', path);
		};

		const do_DB_FS_diff = async () => {
			const fileList: string[] = await this.apiCall('ls_RR');
			const fileSet: Set<string> = new Set(fileList.filter((it: string) => it[0] !== '.' && it[0] !== '_' && BaseItem.isMDFile(it)));
			logger.info('remote files:', fileSet);

			const localNotes = await BaseItem.loadItemsByType(BaseModel.TYPE_NOTE);
			const notePaths: Set<string> = new Set();
			const path_note_map = new Map<string, any>();
			for (const note of localNotes) {
				const p = await BaseItem.buildPathFromRoot(note);
				if (p[0] === '.') continue;
				notePaths.add(p);
				path_note_map.set(p, note);
			}
			logger.info('local note path list:', notePaths);

			const diffLR = new Set(notePaths);	// notes in local but not remote (ie. in DB but not in FS)
			for (const it of fileSet) {
				diffLR.delete(it);
			}
			logger.info('local notes not in remote:', diffLR);

			const diffRL = new Set(fileSet);	// notes in remote but not local (ie. in FS but not in DB)
			for (const it of notePaths) {
				diffRL.delete(it);
			}
			logger.info('remote notes not in local:', diffRL);

			const commonLP = new Set<string>();
			for (const it of notePaths) {
				if (fileSet.has(it)) commonLP.add(it);
			}
			logger.info('notes in both local and remote:', commonLP);

			const save_to_DB_as_note = async (content: any) => {
				content = await BaseItem.unserialize(content);
				content = BaseItem.filter(content);

				// 2017-12-03: This was added because the new user_updated_time and user_created_time properties were added
				// to the items. However changing the database is not enough since remote items that haven't been synced yet
				// will not have these properties and, since they are required, it would cause a problem. So this check
				// if they are present and, if not, set them to a reasonable default.
				// Let's leave these two lines for 6 months, by which time all the clients should have been synced.
				if (!content.user_updated_time) content.user_updated_time = content.updated_time;
				if (!content.user_created_time) content.user_created_time = content.created_time;

				const options: any = {
					autoTimestamp: false,
					nextQueries: BaseItem.updateSyncTimeQueries(syncTargetId, content, time.unixMs()),
					changeSource: ItemChange.SOURCE_SYNC,
				};
				options.isNew = true;

				await BaseItem.save(content, options);

				if (content.encryption_applied) this.dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
			};

			const do_commons = async () => {
				const ids: string[] = [];
				for (const p of commonLP) {
					const noteL: any = path_note_map.get(p);
					ids.push(noteL.id);
				}
				const sql = sprintf(
					`
					SELECT item_id,sync_time FROM sync_items s
					JOIN notes n ON s.item_id = n.id
					WHERE sync_target = %d
					AND s.item_id IN ("${ids.join('","')}")
					ORDER BY s.sync_time DESC
				`,
					syncTargetId,
				);
				// AND (s.sync_time >= n.updated_time)
				const synced_times = await Note.modelSelectAll(sql);
				const sync_map = new Map<string, number>();
				for (const s of synced_times) {
					sync_map.set(s.item_id, s.sync_time);
					// logger.info('synced:', s);
				}
				for (const p of commonLP) {
					const noteL: any = path_note_map.get(p);
					const statR = await this.apiCall('stat', p);
					const sync_time = sync_map.get(noteL.id);
					// sync_time can be undefined
					logger.info(p, 'remote-updated:', statR.updated_time - noteL.updated_time, 'remote-sync:', statR.updated_time - sync_time, 'synced-updated:', sync_time - noteL.updated_time);
					// time different
					// Welcome!/5. Joplin Privacy Policy.md remote: {path: 'Welcome!/5. Joplin Privacy Policy.md', updated_time: 1697392394529, isDir: false} local: 1697389941913
					const updated_R_L = Math.floor((statR.updated_time - noteL.updated_time) / 1000);
					const updateR_S = Math.floor((statR.updated_time - sync_time) / 1000);
					if (updated_R_L === 0 || updateR_S === 0) {
						continue;
					} else if (updated_R_L > 0) {
						// TODO: copy remote to local
					} else if (updated_R_L < 0) {
						// TODO: copy local to remote
					}
				}
			};
			// @ts-expect-error indevelopment
			const do_remote_extras = async () => {
				// for notes in remote but not local (ie. in FS but not in DB)
				const deletedItems = await BaseItem.deletedItems(syncTargetId);
				const deletedIDs: Set<string> = new Set(deletedItems.map(it => it.item_id));
				for (const p of diffRL) {
					const stat = await this.apiCall('stat', p);
					if (stat.isDirectory()) {
						// TODO

						diffRL.delete(p);
					}
				}
				for (const p of diffRL) {
					// const stat = await this.apiCall('stat', p);
					if (BaseItem.isMDFile(p)) {
						const content = await this.apiCall('get', p);
						if (content) {
							const frontMatter = BaseItem.getFrontMatter(content);
							if (frontMatter && frontMatter.id) {
								if (deletedIDs.has(frontMatter.id)) {
									await this.apiCall('delete', p);
								} else {
									const n = BaseItem.loadItemById(frontMatter.id);
									if (n !== null) {
										// TODO
									} else {
										const pList = p.split('/');
										if (pList.length > 1) {
											// const parents = [];
											// for (let i = 0; i < pList.length - 2; i++) {
											// 	const f = BaseModel.loadByTitle(pList[i]);

											// }
										}
										await save_to_DB_as_note(content);
									}
								}
							} else {
								// if no front matter or no id
							}
						}
					}
				}

			};

			// @ts-expect-error indevelopment
			const do_local_extras = async () => {
				// for notes in local but not remote (ie. in DB but not in FS)
				for (const p of diffLR) {
					const stat = await this.apiCall('stat', p);
					if (stat.isDirectory()) {
						// TODO

						// diffLR.delete(p);
					}
				}
				// for (const p of diffRL) {
				// 	if (BaseItem.isMDFile(p)) {
				// 		const n = path_note_map.get(p);
				// 	}
				// }
			};

			if (commonLP.size > 0) await do_commons();

			// if (diffLR.size > 0) await do_local_extras();

			// if (diffRL.size > 0) await do_remote_extras();

		};

		this.dispatch({ type: 'SYNC_STARTED' });
		eventManager.emit('syncStart');

		this.logSyncOperation('starting', null, null, `Starting synchronisation to target ${syncTargetId}... supportsAccurateTimestamp = ${this.api().supportsAccurateTimestamp}; supportsMultiPut = ${this.api().supportsMultiPut} [${synchronizationId}]`);

		const handleCannotSyncItem = async (ItemClass: any, syncTargetId: any, item: any, cannotSyncReason: string, itemLocation: any = null) => {
			await ItemClass.saveSyncDisabled(syncTargetId, item, cannotSyncReason, itemLocation);
			this.dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
		};

		const do_indexing = async () => {
			// We index resources before sync mostly to flag any potential orphan
			// resource before it is being synced. That way, it can potentially be
			// auto-deleted at a later time. Indexing resources is fast so it's fine
			// to call it every time here.
			//
			// https://github.com/laurent22/joplin/issues/932#issuecomment-933736405
			try {
				if (this.resourceService()) {
					logger.info('Indexing resources...');
					await this.resourceService().indexNoteResources();
				}
			} catch (error) {
				logger.error('Error indexing resources:', error);
			}
		};

		const update_shares = async () => {
			// Before synchronising make sure all share_id properties are set
			// correctly so as to share/unshare the right items.
			try {
				await Folder.updateAllShareIds(this.resourceService());
				if (this.shareService_) await this.shareService_.checkShareConsistency();
			} catch (error) {
				if (error && error.code === ErrorCode.IsReadOnly) {
					// We ignore it because the functions above tried to modify a
					// read-only item and failed. Normally it shouldn't happen since
					// the UI should prevent, but if there's a bug in the UI or some
					// other issue we don't want sync to fail because of this.
					logger.error('Could not update share because an item is readonly:', error);
				} else {
					throw error;
				}
			}
		};

		const init_syncTarget = async () => {
			await this.api().initialize();
			this.api().setTempDirName(Dirnames.Temp);

			try {
				let remoteInfo = await fetchSyncInfo(this.api());
				logger.info('Sync target remote info:', remoteInfo);
				eventManager.emit('sessionEstablished');

				let syncTargetIsNew = false;

				if (!remoteInfo.version) {
					logger.info('Sync target is new - setting it up...');
					await this.migrationHandler().upgrade(Setting.value('syncVersion'));
					remoteInfo = await fetchSyncInfo(this.api());
					syncTargetIsNew = true;
				}

				logger.info('Sync target is already setup - checking it...');

				await this.migrationHandler().checkCanSync(remoteInfo);

				let localInfo = await localSyncInfo();

				logger.info('Sync target local info:', localInfo);

				localInfo = await this.setPpkIfNotExist(localInfo, remoteInfo);

				if (syncTargetIsNew && localInfo.activeMasterKeyId) {
					localInfo = setMasterKeyHasBeenUsed(localInfo, localInfo.activeMasterKeyId);
				}

				// console.info('LOCAL', localInfo);
				// console.info('REMOTE', remoteInfo);

				if (!syncInfoEquals(localInfo, remoteInfo)) {
					let newInfo = mergeSyncInfos(localInfo, remoteInfo);
					if (newInfo.activeMasterKeyId) newInfo = setMasterKeyHasBeenUsed(newInfo, newInfo.activeMasterKeyId);
					const previousE2EE = localInfo.e2ee;
					logger.info('Sync target info differs between local and remote - merging infos: ', newInfo.toObject());

					await this.lockHandler().acquireLock(LockType.Exclusive, this.lockClientType(), this.clientId_, { clearExistingSyncLocksFromTheSameClient: true });
					await uploadSyncInfo(this.api(), newInfo);
					await saveLocalSyncInfo(newInfo);
					await this.lockHandler().releaseLock(LockType.Exclusive, this.lockClientType(), this.clientId_);

					// console.info('NEW', newInfo);

					if (newInfo.e2ee !== previousE2EE) {
						if (newInfo.e2ee) {
							const mk = getActiveMasterKey(newInfo);
							await setupAndEnableEncryption(this.encryptionService(), mk);
						} else {
							await setupAndDisableEncryption(this.encryptionService());
						}
					}
				} else {
					// Set it to remote anyway so that timestamps are the same
					// Note: that's probably not needed anymore?
					// await uploadSyncInfo(this.api(), remoteInfo);
				}
			} catch (error) {
				if (error.code === 'outdatedSyncTarget') {
					Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_SHOULD_DO);
				}
				throw error;
			}

			syncLock = await this.lockHandler().acquireLock(LockType.Sync, this.lockClientType(), this.clientId_);

			this.lockHandler().startAutoLockRefresh(syncLock, (error: any) => {
				logger.warn('Could not refresh lock - cancelling sync. Error was:', error);
				this.syncTargetIsLocked_ = true;
				void this.cancel();
			});
		};

		// @ts-expect-error indevelopment
		const do_delete = async () => {
			// ========================================================================
			// 2. DELETE_REMOTE
			// ------------------------------------------------------------------------
			// Delete the remote items that have been deleted locally.
			// ========================================================================

			const deletedItems = await BaseItem.deletedItems(syncTargetId);
			for (let i = 0; i < deletedItems.length; i++) {
				if (this.cancelling()) break;

				const item = deletedItems[i];
				const isResource = item.item_type === BaseModel.TYPE_RESOURCE;
				let path = '';
				if (!isResource) {
					const itemR = await BaseItem.loadItemByTypeAndId(item.item_type, item.item_id);	// TODO: note no longer exist in DB
					path = await BaseItem.buildPathFromRoot(itemR);
				} else {
					path = resourceRemotePath(item.item_id);
				}

				try {
					await this.apiCall('delete', path);
					this.logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
					await BaseItem.remoteDeletedItem(syncTargetId, item.item_id);

				} catch (error) {
					if (error.code === 'isReadOnly') {
						let remoteContent = await this.apiCall('get', path);

						if (remoteContent) {
							remoteContent = await BaseItem.unserialize(remoteContent);
							const ItemClass = BaseItem.itemClass(item.item_type);
							let nextQueries = BaseItem.updateSyncTimeQueries(syncTargetId, remoteContent, time.unixMs());

							if (isResource) {
								nextQueries = nextQueries.concat(Resource.setLocalStateQueries(remoteContent.id, {
									fetch_status: Resource.FETCH_STATUS_IDLE,
								}));
							}

							await ItemClass.save(remoteContent, { isNew: true, autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries });

							if (isResource) this.dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: remoteContent.id });
						}
					} else {
						throw error;
					}
				}
			}
		};

		// @ts-expect-error indevelopment
		const do_upload_update = async () => {
			// ========================================================================
			// 1. UPLOAD
			// ------------------------------------------------------------------------
			// First, find all the items that have been changed since the
			// last sync and apply the changes to remote.
			// ========================================================================

			if (syncSteps.indexOf('update_remote') >= 0) {
				const donePaths: string[] = [];

				const completeItemProcessing = (path: string) => {
					donePaths.push(path);
				};

				while (true) {
					if (this.cancelling()) break;

					const result = await BaseItem.itemsThatNeedSync(syncTargetId);
					const locals = result.items;
					// eslint-disable-next-line no-console
					logger.info('locals:', locals.length, locals, 'syncTargetId', syncTargetId);
					// XJ testing
					await itemUploader.preUploadItems(result.items.filter((it: any) => result.neverSyncedItemIds.includes(it.id)));
					// if there are folders, sync them first
					for (let i = 0; i < locals.length; i++) {
						if (this.cancelling()) break;

						const local = locals[i];
						if (local.type_ !== BaseModel.TYPE_FOLDER) continue;
						const ItemClass: typeof BaseItem = BaseItem.itemClass(local);

						const pathFromRoot = await BaseItem.buildPathFromRoot(local, createDir);
						if (donePaths.indexOf(pathFromRoot) >= 0) throw new JoplinError(sprintf('Processing a path that has already been done: %s. sync_time was not updated? Remote item has an updated_time in the future?', local.title), 'processingPathTwice');

						const remote: RemoteItem = result.neverSyncedItemIds.includes(local.id) ? null : await this.apiCall('stat', pathFromRoot);

						if (!local.sync_time && !remote) {
							await this.apiCall('mkdir', pathFromRoot);
							const reason = 'remote folder does not exist, and local is new and has never been synced';
							this.logSyncOperation('createRemote', local, remote, reason);
							await ItemClass.saveSyncTime(syncTargetId, local, time.unixMs());
							completeItemProcessing(pathFromRoot);
						}
					}

					for (let i = 0; i < locals.length; i++) {
						if (this.cancelling()) break;

						let local = locals[i];
						if (local.type_ === BaseModel.TYPE_FOLDER) continue;
						const ItemClass: typeof BaseItem = BaseItem.itemClass(local);
						const path = BaseItem.fileNameFS(local);

						// Safety check to avoid infinite loops.
						// - In fact this error is possible if the item is marked for sync (via sync_time or force_sync) while synchronisation is in
						//   progress. In that case exit anyway to be sure we aren't in a loop and the item will be re-synced next time.
						// - It can also happen if the item is directly modified in the sync target, and set with an update_time in the future. In that case,
						//   the local sync_time will be updated to Date.now() but on the next loop it will see that the remote item still has a date ahead
						//   and will see a conflict. There's currently no automatic fix for this - the remote item on the sync target must be fixed manually
						//   (by setting an updated_time less than current time).
						const pathFromRoot = await BaseItem.buildPathFromRoot(local, createDir);
						if (donePaths.indexOf(pathFromRoot) >= 0) throw new JoplinError(sprintf('Processing a path that has already been done: %s. sync_time was not updated? Remote item has an updated_time in the future?', pathFromRoot), 'processingPathTwice');
						const remote: RemoteItem = result.neverSyncedItemIds.includes(local.id) ? null : await this.apiCall('stat', pathFromRoot);
						let action = null;
						let itemIsReadOnly = false;
						let reason = '';
						let remoteContent = null;

						const getConflictType = (conflictedItem: any) => {
							if (conflictedItem.type_ === BaseModel.TYPE_NOTE) return 'noteConflict';
							if (conflictedItem.type_ === BaseModel.TYPE_RESOURCE) return 'resourceConflict';
							return 'itemConflict';
						};

						if (!remote) {
							if (!local.sync_time) {
								action = 'createRemote';
								reason = 'remote does not exist, and local is new and has never been synced';
							} else {
								// Note or item was modified after having been deleted remotely
								// "itemConflict" is for all the items except the notes, which are dealt with in a special way
								action = getConflictType(local);
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
								remoteContent = await this.apiCall('get', pathFromRoot);
							} catch (error) {
								if (error.code === 'rejectedByTarget') {
									this.progressReport_.errors.push(error);
									logger.warn(`Rejected by target: ${pathFromRoot}: ${error.message}`);
									completeItemProcessing(path);
									continue;
								} else {
									throw error;
								}
							}
							if (!remoteContent) throw new Error(`Got metadata for path but could not fetch content: ${pathFromRoot}`);
							remoteContent = await BaseItem.unserialize(remoteContent);

							if (remoteContent.updated_time > local.sync_time) {
								// Since, in this loop, we are only dealing with items that require sync, if the
								// remote has been modified after the sync time, it means both items have been
								// modified and so there's a conflict.
								action = getConflictType(local);
								reason = 'both remote and local have changes';
							} else {
								action = 'updateRemote';
								reason = 'local has changes';
							}
						}

						// We no longer upload Master Keys however we keep them
						// in the database for extra safety. In a future
						// version, once it's confirmed that the new E2EE system
						// works well, we can delete them.
						if (local.type_ === ModelType.MasterKey) action = null;

						this.logSyncOperation(action, local, remote, reason);

						// TODO: not sure about folder of resources
						if (local.type_ === BaseModel.TYPE_RESOURCE && (action === 'createRemote' || action === 'updateRemote')) {
							const localState = await Resource.localState(local.id);
							if (localState.fetch_status !== Resource.FETCH_STATUS_DONE) {
								// This condition normally shouldn't happen
								// because the normal cases are as follow:
								//
								// - User creates a resource locally - in that
								//   case the fetch status is DONE, so we cannot
								//   end up here.
								//
								// - User fetches a new resource metadata, but
								//   not the blob - in that case fetch status is
								//   IDLE. However in that case, we cannot end
								//   up in this place either, because the action
								//   cannot be createRemote (because the
								//   resource has not been created locally) or
								//   updateRemote (because a resouce cannot be
								//   modified locally unless the blob is present
								//   too).
								//
								// Possibly the only case we can end up here is
								// if a resource metadata has been downloaded,
								// but not the blob yet. Then the sync target is
								// switched to a different one. In that case, we
								// can have a fetch status IDLE, with an
								// "updateRemote" action, if the timestamp of
								// the server resource is before the timestamp
								// of the local resource.
								//
								// In that case we can't do much so we mark the
								// resource as "cannot sync". Otherwise it will
								// throw the error "Processing a path that has
								// already been done" on the next loop, and sync
								// will never finish because we'll always end up
								// here.
								logger.info(`Need to upload a resource, but blob is not present: ${path}`);
								await handleCannotSyncItem(ItemClass, syncTargetId, local, 'Trying to upload resource, but only metadata is present.');
								action = null;
							} else {
								try {
									const remoteContentPath = resourceRemotePath(local.id);
									const result = await Resource.fullPathForSyncUpload(local);
									const resource = result.resource;
									local = resource as any;
									const localResourceContentPath = result.path;

									if (resource.size >= 10 * 1000 * 1000) {
										logger.warn(`Uploading a large resource (resourceId: ${local.id}, size:${resource.size} bytes) which may tie up the sync process.`);
									}

									await this.apiCall('put', remoteContentPath, null, { path: localResourceContentPath, source: 'file', shareId: resource.share_id });
								} catch (error) {
									if (isCannotSyncError(error)) {
										await handleCannotSyncItem(ItemClass, syncTargetId, local, error.message);
										action = null;
									} else if (error && error.code === ErrorCode.IsReadOnly) {
										action = getConflictType(local);
										itemIsReadOnly = true;
										logger.info('Resource is readonly and cannot be modified - handling it as a conflict:', local);
									} else {
										throw error;
									}
								}
							}
						}
						if (action === 'createRemote' || action === 'updateRemote') {
							let canSync = true;
							try {
								if (this.testingHooks_.indexOf('notesRejectedByTarget') >= 0 && local.type_ === BaseModel.TYPE_NOTE) throw new JoplinError('Testing rejectedByTarget', 'rejectedByTarget');
								if (this.testingHooks_.indexOf('itemIsReadOnly') >= 0) throw new JoplinError('Testing isReadOnly', ErrorCode.IsReadOnly);

								await itemUploader.serializeAndUploadItem(ItemClass, pathFromRoot, local);
							} catch (error) {
								if (error && error.code === 'rejectedByTarget') {
									await handleCannotSyncItem(ItemClass, syncTargetId, local, error.message);
									canSync = false;
								} else if (error && error.code === ErrorCode.IsReadOnly) {
									action = getConflictType(local);
									itemIsReadOnly = true;
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

								await ItemClass.saveSyncTime(syncTargetId, local, time.unixMs());
							}
						}

						await handleConflictAction(
							action as ConflictAction,
							ItemClass,
							!!remote,
							remoteContent,
							local,
							syncTargetId,
							itemIsReadOnly,
							(action: any) => this.dispatch(action),
						);

						completeItemProcessing(pathFromRoot);
					}

					if (!result.hasMore) break;
				}
			} // UPLOAD STEP
		};

		// @ts-expect-error indevelopment
		const do_delta = async () => {
			// ------------------------------------------------------------------------
			// 3. DELTA
			// ------------------------------------------------------------------------
			// Loop through all the remote items, find those that
			// have been created or updated, and apply the changes to local.
			// ------------------------------------------------------------------------

			if (this.downloadQueue_) await this.downloadQueue_.stop();
			this.downloadQueue_ = new TaskQueue('syncDownload');
			this.downloadQueue_.logger_ = logger;

			if (syncSteps.indexOf('delta') >= 0) {
				// At this point all the local items that have changed have been pushed to remote
				// or handled as conflicts, so no conflict is possible after this.

				let context = null;
				let newDeltaContext = null;
				const localFoldersToDelete = [];
				let hasCancelled = false;
				if (lastContext.delta) context = lastContext.delta;

				while (true) {
					if (this.cancelling() || hasCancelled) break;

					const listResult: any = await this.apiCall('delta', '', {
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

						logger: logger,
					});

					const remotes: RemoteItem[] = listResult.items;

					this.logSyncOperation('fetchingTotal', null, null, 'Fetching delta items from sync target', remotes.length);

					const remoteIds = remotes.map(r => BaseItem.pathToId(r.path));
					const locals = await BaseItem.loadItemsByIds(remoteIds);

					logger.info('deltas: locals:', locals, 'remoteIds:', remoteIds);

					for (const remote of remotes) {
						if (this.cancelling()) break;
						logger.info('deltas: remote:', remote);

						let needsToDownload = true;
						const local = locals.find(l => l.id === BaseItem.pathToId(remote.path));
						let romotePathFromRoot = '';
						if (local) {
							if (local.type_ === BaseModel.TYPE_NOTE) {
								romotePathFromRoot = await BaseItem.buildPathFromRoot(local, createDir);
							} else {
								continue;
							}
						}
						if (this.api().supportsAccurateTimestamp) {
							if (local && local.updated_time === remote.jop_updated_time) needsToDownload = false;
						}

						if (needsToDownload) {
							logger.info('deltas: downloading:', romotePathFromRoot);
							this.downloadQueue_.push(romotePathFromRoot, async () => {
								return this.apiCall('get', romotePathFromRoot);
							});
						}
					}

					for (let i = 0; i < remotes.length; i++) {
						if (this.cancelling() || this.testingHooks_.indexOf('cancelDeltaLoop2') >= 0) {
							hasCancelled = true;
							break;
						}

						this.logSyncOperation('fetchingProcessed', null, null, 'Processing fetched item');

						const remote = remotes[i];
						if (!BaseItem.isMDFile(remote.path)) continue; // The delta API might return things like the .sync, .resource or the root folder

						const loadContent = async () => {
							const task = await this.downloadQueue_.waitForResult(path);
							if (task.error) throw task.error;
							if (!task.result) return null;
							return await BaseItem.unserialize(task.result);
						};

						// const path = remote.path;
						const remoteId = BaseItem.pathToId(remote.path);
						let action = null;
						let reason = '';
						let local = locals.find(l => l.id === remoteId);
						let ItemClass = null;
						let content = null;
						let path = remote.path;
						if (local) {
							if (local.type_ === BaseModel.TYPE_NOTE) {
								path = await BaseItem.buildPathFromRoot(local);
							}
						}

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
									if (this.api().supportsAccurateTimestamp && remote.jop_updated_time === local.updated_time) {
										// Nothing to do, and no need to fetch the content
									} else {
										content = await loadContent();
										if (content && content.updated_time > local.updated_time) {
											action = 'updateLocal';
											reason = 'remote is more recent than local';
										}
									}
								}
							}
						} catch (error) {
							if (error.code === 'rejectedByTarget') {
								this.progressReport_.errors.push(error);
								logger.warn(`Rejected by target: ${path}: ${error.message}`);
								action = null;
							} else {
								error.message = `On file ${path}: ${error.message}`;
								throw error;
							}
						}

						if (this.testingHooks_.indexOf('skipRevisions') >= 0 && content && content.type_ === BaseModel.TYPE_REVISION) action = null;

						if (!action) continue;

						this.logSyncOperation(action, local, remote, reason);

						if (action === 'createLocal' || action === 'updateLocal') {
							if (content === null) {
								logger.warn(`Remote has been deleted between now and the delta() call? In that case it will be handled during the next sync: ${path}`);
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

							const options: any = {
								autoTimestamp: false,
								nextQueries: BaseItem.updateSyncTimeQueries(syncTargetId, content, time.unixMs()),
								changeSource: ItemChange.SOURCE_SYNC,
							};
							if (action === 'createLocal') options.isNew = true;
							if (action === 'updateLocal') options.oldItem = local;

							const creatingOrUpdatingResource = content.type_ === BaseModel.TYPE_RESOURCE && (action === 'createLocal' || action === 'updateLocal');

							if (creatingOrUpdatingResource) {
								if (content.size >= this.maxResourceSize()) {
									await handleCannotSyncItem(ItemClass, syncTargetId, content, `File "${content.title}" is larger than allowed ${this.maxResourceSize()} bytes. Beyond this limit, the mobile app would crash.`, BaseItem.SYNC_ITEM_LOCATION_REMOTE);
									continue;
								}

								await ResourceLocalState.save({ resource_id: content.id, fetch_status: Resource.FETCH_STATUS_IDLE });
							}

							if (content.type_ === ModelType.MasterKey) {
								// Special case for master keys - if we download
								// one, we only add it to the store if it's not
								// already there. That can happen for example if
								// the new E2EE migration was processed at a
								// time a master key was still on the sync
								// target. In that case, info.json would not
								// have it.
								//
								// If info.json already has the key we shouldn't
								// update because the most up to date keys
								// should always be in info.json now.
								const existingMasterKey = await MasterKey.load(content.id);
								if (!existingMasterKey) {
									logger.info(`Downloaded a master key that was not in info.json - adding it to the store. ID: ${content.id}`);
									await MasterKey.save(content);
								}
							} else {
								await ItemClass.save(content, options);
							}

							if (creatingOrUpdatingResource) this.dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: content.id });

							// if (!hasAutoEnabledEncryption && content.type_ === BaseModel.TYPE_MASTER_KEY && !masterKeysBefore) {
							// 	hasAutoEnabledEncryption = true;
							// 	logger.info('One master key was downloaded and none was previously available: automatically enabling encryption');
							// 	logger.info('Using master key: ', content.id);
							// 	await this.encryptionService().enableEncryption(content);
							// 	await this.encryptionService().loadMasterKeysFromSettings();
							// 	logger.info('Encryption has been enabled with downloaded master key as active key. However, note that no password was initially supplied. It will need to be provided by user.');
							// }

							if (content.encryption_applied) this.dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
						} else if (action === 'deleteLocal') {
							if (local.type_ === BaseModel.TYPE_FOLDER) {
								localFoldersToDelete.push(local);
								continue;
							}

							const ItemClass = BaseItem.itemClass(local.type_);
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
							const deltaToSave = { ...listResult.context };
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
		};

		await do_indexing();

		await update_shares();

		const itemUploader = new ItemUploader(this.api(), this.apiCall);

		let errorToThrow = null;
		let syncLock = null;

		try {
			await init_syncTarget();

			await do_DB_FS_diff();

			// await do_delete();

			// await do_upload_update();

			// await do_delta();

		} catch (error) {
			if (throwOnError) {
				logger.info(error.message);
				errorToThrow = error;
			} else if (error && ['cannotEncryptEncrypted', 'noActiveMasterKey', 'processingPathTwice', 'failSafe', 'lockError', 'outdatedSyncTarget'].indexOf(error.code) >= 0) {
				// Only log an info statement for this since this is a common condition that is reported
				// in the application, and needs to be resolved by the user.
				// Or it's a temporary issue that will be resolved on next sync.
				logger.info(error.message);

				if (error.code === 'failSafe' || error.code === 'lockError') {
					// Get the message to display on UI, but not in testing to avoid poluting stdout
					if (!shim.isTestingEnv()) this.progressReport_.errors.push(error.message);
					this.logLastRequests();
				}
			} else if (error.code === 'unknownItemType') {
				this.progressReport_.errors.push(_('Unknown item type downloaded - please upgrade Joplin to the latest version'));
				logger.error(error);
			} else {
				logger.error(error);
				if (error.details) logger.error('Details:', error.details);

				// Don't save to the report errors that are due to things like temporary network errors or timeout.
				if (!shim.fetchRequestCanBeRetried(error)) {
					this.progressReport_.errors.push(error);
					this.logLastRequests();
				}
			}
		}

		if (syncLock) {
			this.lockHandler().stopAutoLockRefresh(syncLock);
			await this.lockHandler().releaseLock(LockType.Sync, this.lockClientType(), this.clientId_);
		}

		this.syncTargetIsLocked_ = false;

		if (this.cancelling()) {
			logger.info('Synchronisation was cancelled.');
			this.cancelling_ = false;
		}

		// After syncing, we run the share service maintenance, which is going
		// to fetch share invitations, if any.
		if (this.shareService_) {
			try {
				await this.shareService_.maintenance();
			} catch (error) {
				logger.error('Could not run share service maintenance:', error);
			}
		}

		this.progressReport_.completedTime = time.unixMs();

		this.logSyncOperation('finished', null, null, `Synchronisation finished [${synchronizationId}]`);

		await this.logSyncSummary(this.progressReport_);

		eventManager.emit('syncComplete', {
			withErrors: Synchronizer.reportHasErrors(this.progressReport_),
		});

		this.onProgress_ = function() { };
		this.progressReport_ = {};

		this.dispatch({ type: 'SYNC_COMPLETED', isFullSync: this.isFullSync(syncSteps) });

		this.state_ = 'idle';

		if (errorToThrow) throw errorToThrow;

		return outputContext;
	}
}
