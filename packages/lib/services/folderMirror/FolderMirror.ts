import { ModelType } from '../../BaseModel';
import { DirectoryWatchEvent, DirectoryWatchEventType, DirectoryWatcher } from '../../fs-driver-base';
import Folder, { FolderEntityWithChildren } from '../../models/Folder';
import Note from '../../models/Note';
import shim from '../../shim';
import { serialize } from '../../utils/frontMatter';
import { FolderEntity, NoteEntity, ResourceEntity } from '../database/types';
import { basename, dirname, join, relative } from 'path';
import writeFolderInfo from './utils/folderInfo/writeFolderInfo';
import { FolderItem, ResourceItem } from './types';
import ItemTree, { ActionListeners, AddOrUpdateEvent, noOpActionListeners } from './ItemTree';
import uuid from '../../uuid';
import BaseItem from '../../models/BaseItem';
import AsyncActionQueue from '../../AsyncActionQueue';
import { folderInfoFileName } from './utils/folderInfo';
import LinkTracker, { LinkType } from './LinkTracker';
import debugLogger from './utils/debugLogger';
import statToItem from './utils/statToItem';
import fillRemoteTree from './utils/fillRemoteTree';
import Resource from '../../models/Resource';
import { itemDiffFields, resourceMetadataExtension, resourcesDirId, resourcesDirItem, resourcesDirName } from './constants';
import resourceToMetadataYml from './utils/resourceToMetadataYml';
import Logger from '@joplin/utils/Logger';
import keysMatch from './utils/keysMatch';
import mergeTrees from './utils/mergeTrees';
const { ALL_NOTES_FILTER_ID } = require('../../reserved-ids.js');

// A logger for less verbose logs (debugLogger is for very verbose logging).
const logger = Logger.create('FolderMirror');

const getNoteMd = async (note: NoteEntity) => {
	// const tagIds = [];//noteTags.filter(nt => nt.note_id === note.id).map(nt => nt.tag_id);
	const tagTitles: string[] = [];// tags.filter(t => tagIds.includes(t.id)).map(t => t.title);

	const toSave = { ...note };

	// Avoid including extra metadata TODO
	delete toSave.user_created_time;
	delete toSave.user_updated_time;
	delete toSave.updated_time;
	delete toSave.created_time;

	return serialize(toSave, tagTitles, { includeId: true, replaceResourceLinks: false });
};

enum FolderMirrorEventType {
	FullSync = 'fullSync',
	WatcherEvent = 'watcherEvent',
	DatabaseItemChange = 'dbChange',
	DatabaseItemDelete = 'dbDelete',
}

type LocalChangeEvent = { type: FolderMirrorEventType.DatabaseItemChange; id: string; parentId: string };
type LocalDeleteEvent = { type: FolderMirrorEventType.DatabaseItemDelete; id: string };
type WatcherEvent = { type: FolderMirrorEventType.WatcherEvent; event: DirectoryWatchEvent };
type FullSyncEvent = { type: FolderMirrorEventType.FullSync };

type ActionQueueEvent = LocalChangeEvent|LocalDeleteEvent|WatcherEvent|FullSyncEvent;

export default class {

	private watcher_: DirectoryWatcher|null = null;
	private modifyRemoteActions_: ActionListeners;
	private modifyLocalActions_: ActionListeners;
	private localTree_: ItemTree;
	private remoteTree_: ItemTree;
	private actionQueue_: AsyncActionQueue<ActionQueueEvent>;
	private fullSyncEndListeners_: ((error: unknown)=> void)[] = [];
	private remoteLinkTracker_: LinkTracker;

	private createUuid_: ()=> string = () => uuid.create();

	public constructor(public readonly baseFilePath: string, public readonly baseFolderId: string) {
		if (baseFolderId === ALL_NOTES_FILTER_ID) {
			this.baseFolderId = '';
		}

		const baseItem = { id: this.baseFolderId, type_: ModelType.Folder };

		this.remoteLinkTracker_ = new LinkTracker(this.onLinkTrackerItemUpdate_);
		this.localTree_ = new ItemTree(baseItem);
		this.remoteTree_ = new ItemTree(baseItem, this.remoteLinkTracker_.toEventHandlers(LinkType.PathLink));

		this.actionQueue_ = new AsyncActionQueue();
		this.actionQueue_.setCanSkipTaskHandler((current, next) => {
			const currentContext = current.context;
			const nextContext = next.context;
			if (currentContext.type !== next.context.type) return false;

			if (currentContext.type === FolderMirrorEventType.FullSync) {
				return true;
			} else if (
				currentContext.type === FolderMirrorEventType.DatabaseItemChange
				|| currentContext.type === FolderMirrorEventType.DatabaseItemDelete
			) {
				if (currentContext.type !== nextContext.type) throw new Error('Unreachable');

				return currentContext.id === nextContext.id;
			} else {
				return false;
			}
		});

		const onLocalAddOrUpdate = async (event: AddOrUpdateEvent, isNew: boolean) => {
			let item = event.item;

			// Don't save virtual items.
			if (item.virtual) return { ...item };

			// Sometimes, when an item is moved, it is given the deleted flag because it
			// is first unlinked, then moved.
			if (item.deleted_time || !('deleted_time' in item)) {
				debugLogger.debug('onAddOrUpdate/move item from trash');
				item = { ...item, deleted_time: 0 };
			}

			if (isNew && !item.id) {
				// Use the custom UUID creation logic -- this allows consistent in-test
				// ID generation.
				item = { ...item, id: this.createUuid_() };
			}

			let result;
			if (item.type_ === ModelType.Folder) {
				result = await Folder.save(item, { isNew });
			} else if (item.type_ === ModelType.Note) {
				const note = item as NoteEntity;
				const toSave = {
					...note,
					body: this.remoteLinkTracker_.convertLinkTypes(LinkType.IdLink, note.body, event.path),
				};
				result = await Note.save(toSave, { isNew });
			} else if (item.type_ === ModelType.Resource) {
				if (event.path.endsWith(resourceMetadataExtension)) {
					logger.warn('Attempting to save a metadata file as a new local file. This is probably a mistake. Path:', event.path);
				}

				const resource = item as ResourceItem;
				const toSave = { ...resource };

				// Remove filled properties
				delete toSave.parent_id;
				delete toSave.deleted_time;

				let localPath = Resource.fullPath(toSave);
				const remotePath = join(this.baseFilePath, event.path);
				let changed = true;
				if (!isNew && await shim.fsDriver().exists(localPath)) {
					const localSum = await shim.fsDriver().md5File(localPath);
					const remoteSum = await shim.fsDriver().md5File(remotePath);
					changed = (remoteSum !== localSum);
				}

				// The file has also been changed.
				if (changed) {
					toSave.blob_updated_time = item.updated_time;
				}

				result = await Resource.save(toSave, { isNew }) as ResourceItem;

				if (changed) {
					// localPath may have been set incorrectly if toSave was a new item.
					localPath = Resource.fullPath(result);
					debugLogger.debug('copy changed resource', remotePath, '->', localPath, 'item', result);

					await shim.fsDriver().copy(remotePath, localPath);
				}

				// Fill properties that don't exist in the database (but are present for
				// compatibility).
				result.parent_id = item.parent_id;
				result.deleted_time = item.deleted_time;
			}
			return result;
		};

		this.modifyLocalActions_ = {
			onAdd: async (event) => {
				// Determine if it's new or not -- the item could be coming from a
				// different (unsynced) folder.
				const item = event.item;
				const isNew = !item.id || !await BaseItem.loadItemById(item.id, { fields: ['id'] });
				debugLogger.debug('onAdd', item.title, isNew ? '[new]' : '[update]');
				return onLocalAddOrUpdate(event, isNew);
			},
			onUpdate: async (event) => {
				debugLogger.debug('onUpdate', event.item.title);
				await onLocalAddOrUpdate(event, false);
			},
			onDelete: async ({ item }): Promise<void> => {
				if (item.virtual) return;

				debugLogger.debug('onDelete', item.title);

				if (item.type_ === ModelType.Note) {
					await Note.delete(item.id, { toTrash: true, sourceDescription: 'FileMirroringService' });
				} else if (item.type_ === ModelType.Folder) {
					await Folder.delete(item.id, { toTrash: true, sourceDescription: 'FileMirroringService' });
				} else if (item.type_ === ModelType.Resource) {
					// No action needed -- Joplin resource deletion is managed elsewhere.
				}
			},
			onMove: async ({ movedItem })=> {
				debugLogger.debug('onMove', movedItem.title);
				if (movedItem.virtual) return;

				if (movedItem.type_ === ModelType.Folder) {
					await Folder.save({ ...movedItem });
				} else if (movedItem.type_ === ModelType.Note) {
					await Note.save({ ...movedItem });
				} else if (movedItem.type_ === ModelType.Resource) {
					// No action needed -- resources don't have a parent ID.
				}
			},
		};

		const onRemoteAddOrUpdate = async ({ path, item }: AddOrUpdateEvent) => {
			debugLogger.debug('remote.update', path);

			const fullPath = join(baseFilePath, path);
			if (item.type_ === ModelType.Folder) {
				await shim.fsDriver().mkdir(fullPath);

				// No need to store .folder.yml for virtual folders --- these folders won't be
				// added to Joplin.
				if (!item.virtual) {
					await writeFolderInfo(fullPath, {
						id: item.id,
						icon: (item as FolderEntity).icon,
						title: item.title,
					});
				}
			} else if (item.type_ === ModelType.Note) {
				const note = item as NoteEntity;
				const toSave = {
					...note,
					body: this.remoteLinkTracker_.convertLinkTypes(LinkType.PathLink, note.body, path),
				};
				await shim.fsDriver().writeFile(fullPath, await getNoteMd(toSave), 'utf8');
			} else if (item.type_ === ModelType.Resource) {
				if (fullPath.endsWith(resourceMetadataExtension)) {
					throw new Error('Unsupported path. The .metadata.yml extension is reserved for resource metadata');
				}

				// IMPORTANT: Write the metadata first. When writing the resource triggers the file watcher,
				//            this allows the item ID to be found.
				// TODO: Remove this workaround & fix the underlying issue.
				const metadata = resourceToMetadataYml(item);
				await shim.fsDriver().writeFile(`${fullPath}${resourceMetadataExtension}`, metadata, 'utf8');

				const internalSourcePath = Resource.fullPath(item, false);
				debugLogger.debug('remote.update/copy resource', path, 'from', internalSourcePath, 'to', fullPath, 'id', item.id);
				if (!await shim.fsDriver().exists(internalSourcePath)) {
					logger.warn(`Unable to copy resource from internal for item ${item.id}.`);
				} else {
					await shim.fsDriver().copy(internalSourcePath, fullPath);
				}
			} else {
				throw new Error(`Cannot handle item with type ${item.type_}`);
			}
		};

		this.modifyRemoteActions_ = {
			onAdd: onRemoteAddOrUpdate,
			onUpdate: onRemoteAddOrUpdate,
			onDelete: async ({ path }): Promise<void> => {
				debugLogger.debug('remote.onDelete', path);
				await shim.fsDriver().remove(join(baseFilePath, path));
			},
			onMove: async ({ fromPath, toPath })=> {
				debugLogger.debug('remote.onMove', fromPath, '->', toPath);
				const fullFromPath = join(baseFilePath, fromPath);
				const fullToPath = join(baseFilePath, toPath);

				// Because fsDriver.move is recursive, it may be the case that this item was already
				// moved when a parent directory was.
				const sourceExists = await shim.fsDriver().exists(fullFromPath);
				if (!sourceExists && await shim.fsDriver().exists(fullToPath)) {
					debugLogger.debug('remote.onMove/skip -- already done');
				} else {
					if (!sourceExists) {
						throw new Error(`Cannot move -- neither source nor destination exists. Incorrect toPath? ${toPath}`);
					} else {
						await shim.fsDriver().move(fullFromPath, fullToPath);
					}
				}
			},
		};
	}

	private onLinkTrackerItemUpdate_ = async (updatedItem: FolderItem) => {
		debugLogger.debug('Link tracker item update', updatedItem.title);
		debugLogger.group();
		updatedItem = await this.remoteTree_.processItem(null, updatedItem, this.modifyRemoteActions_);
		await this.localTree_.processItem(null, updatedItem, this.modifyLocalActions_);
		debugLogger.groupEnd();
	};

	public onLocalItemDelete(id: string) {
		if (this.watcher_ && this.localTree_.hasId(id)) {
			this.actionQueue_.push(this.handleQueueAction, { type: FolderMirrorEventType.DatabaseItemDelete, id });
		}
	}

	public onLocalItemUpdate(item: FolderItem) {
		if (!this.watcher_) return;

		// Note that we can't skip out-of-tree items at this stage -- it's possible that a parent of the
		// current item will be added by a pending queue action (so we can't check parent/ancestor IDs here).
		this.actionQueue_.push(
			this.handleQueueAction,
			{ type: FolderMirrorEventType.DatabaseItemChange, id: item.id, parentId: item.parent_id },
		);
	}

	public async watch() {
		if (this.watcher_) return;

		let watcherLoaded = false;
		this.watcher_ = await shim.fsDriver().watchDirectory(this.baseFilePath, async (event): Promise<void> => {
			// Skip events from an initial scan, which should already be handled by a full sync.
			if (!watcherLoaded) return;

			this.actionQueue_.push(this.handleQueueAction, { type: FolderMirrorEventType.WatcherEvent, event });
		});
		watcherLoaded = true;
	}

	public async stopWatching() {
		if (this.watcher_) {
			const closePromise = this.watcher_.close();
			this.watcher_ = null;
			await closePromise;
		}
	}

	public async waitForIdle() {
		await this.actionQueue_.waitForAllDone();
	}

	public fullSync() {
		return new Promise<void>((resolve, reject) => {
			this.fullSyncEndListeners_.push((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});

			this.actionQueue_.push(this.handleQueueAction, { type: FolderMirrorEventType.FullSync });
		});
	}

	private async addNewLocalResource(id: string, addToRemote: boolean) {
		if (this.localTree_.hasId(id)) {
			debugLogger.debug('Not adding resource with id', id, 'because already present.');
			return null;
		}

		const resourceFields = ['id', 'title', 'updated_time', 'blob_updated_time', 'mime', 'filename', 'file_extension'];
		const resource: ResourceItem = { ...await Resource.load(id, { fields: resourceFields }) };
		resource.parent_id = resourcesDirId;
		resource.deleted_time = 0;
		await this.localTree_.addItemTo(resourcesDirName, resource, noOpActionListeners);
		if (addToRemote) {
			await this.remoteTree_.addItemTo(resourcesDirName, resource, this.modifyRemoteActions_);
		}
		debugLogger.debug('Added resource', id, 'to', resourcesDirName);
		return resource;
	}

	private async fullSyncTask() {
		const filePath = this.baseFilePath;
		const baseFolderId = this.baseFolderId;
		const folderFields = ['id', 'icon', 'title', 'parent_id', 'updated_time', 'deleted_time'];
		const isAllNotes = baseFolderId === '';

		debugLogger.debug('starting full sync');
		debugLogger.group();

		const childrenFolders =
			isAllNotes ? await Folder.all({ fields: folderFields }) : await Folder.allChildrenFolders(baseFolderId, folderFields);
		const allFolders = await Folder.allAsTree(childrenFolders, { toplevelId: baseFolderId });

		this.localTree_.resetData();
		this.remoteTree_.resetData();


		const processFolders = async (basePath: string, parentId: string, folders: FolderEntityWithChildren[]) => {
			for (const folder of folders) {
				if (folder.deleted_time) continue;

				await this.localTree_.addItemTo(basePath, folder, noOpActionListeners);
				const folderPath = this.localTree_.pathFromId(folder.id);
				await processFolders(folderPath, folder.id, folder.children || []);
			}

			const noteFields = ['id', 'title', 'body', 'is_todo', 'todo_due', 'todo_completed', 'parent_id', 'updated_time', 'deleted_time'];
			const childNotes = await Note.allByParentId(parentId, { fields: noteFields });

			for (const note of childNotes) {
				if (note.deleted_time) continue;

				// Add resources first, so that their links get processed first.
				const linkedItems = await Note.linkedItems(note.body ?? '');
				const linkedResources: ResourceEntity[] = linkedItems.filter(item => item.type_ === ModelType.Resource);

				// Sort the linked resources for consistency when testing (default sorting may involve
				// ID ordering).
				linkedResources.sort((a, b) => {
					const createdTimeDiff = a.created_time - b.created_time;
					if (createdTimeDiff !== 0) return createdTimeDiff;
					const updatedTimeDiff = a.updated_time - b.updated_time;
					if (updatedTimeDiff !== 0) return updatedTimeDiff;
					return 0;
				});

				for (const resource of linkedResources) {
					await this.addNewLocalResource(resource.id, false);
				}

				if (!note.deleted_time) {
					await this.localTree_.addItemTo(basePath, note, noOpActionListeners);
				}
			}
		};

		await this.localTree_.addItemAt(resourcesDirName, resourcesDirItem, noOpActionListeners);
		await processFolders('', baseFolderId, allFolders);
		debugLogger.debug('built local tree. Building remote:');

		debugLogger.group();
		const generatedIds: string[] = [];
		await fillRemoteTree(filePath, this.remoteTree_, {
			onAdd: async ({ item }) => {
				// Items need IDs to be added to the remoteTree.
				if (!item.id) {
					debugLogger.debug('Item missing ID.');

					if (this.localTree_.hasPath(filePath)) {
						item = { ...item, id: this.localTree_.idAtPath(filePath) };
					} else {
						item = { ...item, id: this.createUuid_() };
						generatedIds.push(item.id);
						debugLogger.debug('Creating a new ID,', item.id);
					}
				}

				return item;
			},
		});
		debugLogger.groupEnd();

		for (const id of generatedIds) {
			const path = this.remoteTree_.pathFromId(id);
			const item = this.remoteTree_.getAtId(id);
			await this.remoteTree_.updateAtPath(path, item, this.modifyRemoteActions_);
		}
		debugLogger.debug('built remote tree', generatedIds.length, 'new IDs');

		await mergeTrees(this.localTree_, this.remoteTree_, this.modifyLocalActions_, this.modifyRemoteActions_);

		debugLogger.groupEnd();
	}

	private async databaseItemChangeTask(id: string, parentId: string) {
		if (!this.localTree_.hasId(id) && !this.localTree_.hasId(parentId)) {
			debugLogger.debug('skip item', id, 'not in export dir');
			return;
		}

		let item: FolderItem = await BaseItem.loadItemById(id);
		debugLogger.debug('localItemUpdate', item.title);

		if (item.type_ === ModelType.Resource) {
			// Resources generally don't have a parent_id or deleted_time, so these need to be added.
			item = { parent_id: resourcesDirId, deleted_time: 0, ...item };
		} else if (item.type_ !== ModelType.Folder && item.type_ !== ModelType.Note) {
			throw new Error('databaseItemChangeTask only supports notes, resources, and folders');
		}

		debugLogger.debug('onLocalItemUpdate', item.title, 'in', this.localTree_.pathFromId(item.parent_id));

		let localItem: FolderItem|null = null;
		if (this.localTree_.hasId(item.id)) {
			localItem = this.localTree_.getAtId(item.id);

			// Ensure that all links are database links so we can do a comparison
			if (localItem.type_ === ModelType.Note) {
				const path = this.localTree_.pathFromId(item.id);
				const body = (localItem as NoteEntity).body;
				localItem = {
					...localItem,
					// Use remoteLinkTracker_ -- its paths are more likely to be accurate to
					// the file system after a full sync has completed.
					body: this.remoteLinkTracker_.convertLinkTypes(LinkType.IdLink, body, path),
				};
			}

			if (keysMatch(localItem, item, [...itemDiffFields, 'parent_id'])) {
				debugLogger.debug('onLocalItemUpdate/skip', item.title, item.deleted_time);
				return;
			}
		}

		if (item.type_ === ModelType.Note) {
			const oldBody = (localItem as NoteEntity)?.body ?? '';
			const oldLinkedResources = await Note.linkedResourceIds(oldBody);

			const newBody = (item as NoteEntity).body;
			const newLinkedResources = await Note.linkedResourceIds(newBody);

			// Handle just-attached resources.
			// TODO: Should this be done with LinkTracker?
			for (const resourceId of newLinkedResources) {
				if (!oldLinkedResources.includes(resourceId)) {
					debugLogger.debug('new resource id', resourceId);
					await this.addNewLocalResource(resourceId, true);
				}
			}
		}

		await this.localTree_.processItem(null, item, noOpActionListeners);
		await this.remoteTree_.processItem(null, item, this.modifyRemoteActions_);

		await this.localTree_.optimizeItemPath(item, noOpActionListeners);
		await this.remoteTree_.optimizeItemPath(item, this.modifyRemoteActions_);
	}

	private async databaseItemDeleteTask(id: string) {
		debugLogger.debug('onLocalItemDelete', this.localTree_.pathFromId(id));

		await this.localTree_.deleteItemAtId(id, noOpActionListeners);
		await this.remoteTree_.deleteItemAtId(id, this.modifyRemoteActions_);
	}

	private async handleWatcherEventTask(event: DirectoryWatchEvent): Promise<void> {
		const itemAtPath = async (relativePath: string) => {
			let stat = await shim.fsDriver().stat(join(this.baseFilePath, relativePath));
			stat = { ...stat, path: relativePath };

			return await statToItem(this.baseFilePath, stat, this.remoteTree_);
		};

		const handleFileAdd = async (path: string, item?: FolderItem) => {
			if (path.startsWith('.')) return;

			item ??= await itemAtPath(path);
			if (!item) return; // Unsupported

			// Un-deletes the item, if it's already present in the database.
			item = { ...item, deleted_time: 0 };

			debugLogger.debug('handleAdd at', path);
			debugLogger.group();

			// Add parent dirs
			await handleFileAdd(dirname(path));

			item = await this.localTree_.processItem(null, item, this.modifyLocalActions_);

			let writeToDisk = false;
			if (item.type_ === ModelType.Folder) {
				// When folders are added remotely, we often need to update/correct the metadata.
				// Avoid writing to disk otherwise as it can fire add events.
				writeToDisk = !await shim.fsDriver().exists(join(this.baseFilePath, path, folderInfoFileName));
			}

			// Handle the case where a note is duplicated and has metadata with an
			// already-in-use ID. Creating a new ID for the new item does not work here
			// because of how renaming events are fired. When a file is renamed, it is
			// copied, **then** the original is deleted. As such, we can't assign the new copy
			// a new ID without breaking file renaming.
			if (item.id && this.remoteTree_.hasId(item.id)) {
				const remotePath = this.remoteTree_.pathFromId(item.id);
				if (remotePath !== path) {
					writeToDisk = true;
				}
			}

			if (writeToDisk) {
				await this.remoteTree_.processItem(path, item, this.modifyRemoteActions_);
			} else {
				await this.remoteTree_.processItem(path, item, noOpActionListeners);
			}

			debugLogger.groupEnd();
		};

		let fullPath = event.path;
		let path = relative(this.baseFilePath, fullPath);

		if (!path || path === '.') return;

		debugLogger.debug('event', event.type, path);
		debugLogger.group();

		// Folder changed (because of the folder metadata file)
		if (basename(fullPath) === folderInfoFileName) {
			debugLogger.debug('Folder info changed');
			fullPath = dirname(fullPath);
			path = dirname(path);
		}

		// Resource metadata updated -- use this to update the resource.
		if (path.endsWith(resourceMetadataExtension) && dirname(path) === resourcesDirName) {
			path = path.substring(0, path.length - resourceMetadataExtension.length);
			fullPath = join(this.baseFilePath, path);
		}

		try {
			if (await shim.fsDriver().exists(fullPath)) {
				let item = await itemAtPath(path);

				// Unsupported file type
				if (!item) {
					debugLogger.debug('Unsupported file type', path);
					return;
				}

				if (event.type === DirectoryWatchEventType.Add) { // File created, renamed, or deleted
					await handleFileAdd(path, item);
				} else if (event.type === DirectoryWatchEventType.Change) {
					if (!item.id && this.remoteTree_.hasPath(path)) {
						item.id = this.remoteTree_.idAtPath(path);
					}

					const originalRemoteItem = this.remoteTree_.getAtId(item.id);

					item = await this.localTree_.processItem(null, item, this.modifyLocalActions_);
					await this.remoteTree_.processItem(path, item, noOpActionListeners);

					// When a folder or note is renamed in its frontmatter, also update the filename.
					if (item.title !== originalRemoteItem?.title) {
						debugLogger.debug('Optimize remote path');
						await this.remoteTree_.optimizeItemPath(item, this.modifyRemoteActions_);
						await this.localTree_.optimizeItemPath(item, noOpActionListeners);
					}
				} else if (event.type === DirectoryWatchEventType.Unlink) {
					logger.warn(`Path ${path} was marked as unlinked, but still exists.`);
				} else {
					const exhaustivenessCheck: never = event.type;
					return exhaustivenessCheck;
				}
			} else if (this.remoteTree_.hasPath(path)) {
				const remoteItem = this.remoteTree_.getAtPath(path);
				debugLogger.debug(`file (note title: ${remoteItem.title}) doesn't exist at ${fullPath}. Delete`);

				await this.remoteTree_.deleteAtPath(path, noOpActionListeners);
				await this.localTree_.deleteItemAtId(remoteItem.id, this.modifyLocalActions_);
			}
		} finally {
			debugLogger.groupEnd();
		}
	}

	private handleQueueAction = async (context: ActionQueueEvent) => {
		debugLogger.debug('action', context.type);
		switch (context.type) {
		case FolderMirrorEventType.FullSync:
			try {
				await this.fullSyncTask();
			} catch (error) {
				for (const listener of this.fullSyncEndListeners_) {
					listener(error);
				}
				this.fullSyncEndListeners_ = [];
				throw error;
			}

			for (const listener of this.fullSyncEndListeners_) {
				listener(null);
			}
			this.fullSyncEndListeners_ = [];
			break;
		case FolderMirrorEventType.DatabaseItemChange:
			return this.databaseItemChangeTask(context.id, context.parentId);
		case FolderMirrorEventType.DatabaseItemDelete:
			return this.databaseItemDeleteTask(context.id);
		case FolderMirrorEventType.WatcherEvent:
			return this.handleWatcherEventTask(context.event);
		default:
		{
			const exhaustivenessCheck: never = context;
			return exhaustivenessCheck;
		}
		}
	};

	public test__setCreateUuid(fn: ()=> string) {
		this.createUuid_ = fn;
	}
}
