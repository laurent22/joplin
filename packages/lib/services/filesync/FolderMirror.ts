import { ModelType } from '../../BaseModel';
import { DirectoryWatchEvent, DirectoryWatchEventType, DirectoryWatcher, Stat } from '../../fs-driver-base';
import Folder, { FolderEntityWithChildren } from '../../models/Folder';
import Note from '../../models/Note';
import { friendlySafeFilename } from '../../path-utils';
import shim from '../../shim';
import { serialize } from '../../utils/frontMatter';
import { FolderEntity, NoteEntity } from '../database/types';
import loadFolderInfo from './folderInfo/loadFolderInfo';
import { parse as parseFrontMatter } from '../../utils/frontMatter';
import { basename, dirname, extname, join, normalize, relative } from 'path';
import writeFolderInfo from './folderInfo/writeFolderInfo';
import { FolderItem } from './types';
import ItemTree, { ActionListeners, AddActionListener, UpdateEvent, noOpActionListeners } from './ItemTree';
import uuid from '../../uuid';
import BaseItem from '../../models/BaseItem';
import AsyncActionQueue from '../../AsyncActionQueue';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
const { ALL_NOTES_FILTER_ID } = require('../../reserved-ids.js');

const debugLogger = new Logger();
debugLogger.addTarget(TargetType.Console);
debugLogger.setLevel(LogLevel.Debug);
debugLogger.enabled = false;

const makeItemPaths = (basePath: string, items: FolderItem[]) => {
	const output: Map<string, string> = new Map();
	const existingFilenames: string[] = [];

	for (const item of items) {
		const isFolder = item.type_ === ModelType.Folder;
		const basename = friendlySafeFilename(item.title);

		let filename;
		let counter = 0;
		do {
			filename = `${basename}${counter ? ` (${counter})` : ''}${isFolder ? '' : '.md'}`;
			counter++;
		} while (existingFilenames.includes(filename));
		output.set(item.id, basePath ? join(basePath, filename) : filename);
		existingFilenames.push(filename);
	}

	return output;
};

const statToItem = async (baseFolderPath: string, stat: Stat, remoteTree: ItemTree): Promise<FolderItem|null> => {
	const base: FolderItem = {
		updated_time: stat.mtime.getTime(),
	};
	const parentPath = normalize(dirname(stat.path));
	if (remoteTree.hasPath(parentPath)) {
		base.parent_id = remoteTree.idAtPath(parentPath);
	} else if (parentPath === '.') {
		base.parent_id = remoteTree.idAtPath('.');
	}

	const isFolder = stat.isDirectory();

	let result: FolderItem;
	if (isFolder) {
		const folderInfo = await loadFolderInfo(join(baseFolderPath, stat.path));
		if (folderInfo.id && !await Folder.load(folderInfo.id)) {
			delete folderInfo.id;
		}
		const item: FolderEntity = {
			...base,
			title: folderInfo.title,
			type_: ModelType.Folder,
		};
		if (folderInfo.folder_info_updated) {
			item.updated_time = Math.max(folderInfo.folder_info_updated, item.updated_time);
		}
		if (folderInfo.id) {
			item.id = folderInfo.id;
		}
		if (folderInfo.icon) {
			item.icon = folderInfo.icon;
		}
		result = item;
	} else {
		if (extname(stat.path) !== '.md') return null;

		const fileContent = await shim.fsDriver().readFile(join(baseFolderPath, stat.path), 'utf8');
		const { metadata } = parseFrontMatter(fileContent);

		result = {
			...base,
			...metadata,

			// Use || to handle the case where the title is empty, which can happen for empty
			// frontmatter.
			title: metadata.title || basename(stat.path, '.md'),
			body: await Note.replaceResourceExternalToInternalLinks(metadata.body ?? ''),

			type_: ModelType.Note,
		};
	}

	return result;
};

const fillRemoteTree = async (baseFolderPath: string, remoteTree: ItemTree, addItemHandler: AddActionListener) => {
	const stats = await shim.fsDriver().readDirStats(baseFolderPath, { recursive: true });

	// Sort so that parent folders are visited before child folders.
	stats.sort((a, b) => a.path.length - b.path.length);

	for (const stat of stats) {
		const item = await statToItem(baseFolderPath, stat, remoteTree);
		if (!item) continue;

		await remoteTree.addItemAt(stat.path, item, addItemHandler);
	}
};

const keysMatch = (localItem: FolderItem, remoteItem: FolderItem, keys: ((keyof FolderEntity)|(keyof NoteEntity))[]) => {
	for (const key of keys) {
		if (key in localItem !== key in remoteItem) {
			return false;
		}
		if (key in localItem && localItem[key as keyof typeof localItem] !== remoteItem[key as keyof typeof remoteItem]) {
			return false;
		}
	}
	return true;
};

const mergeTrees = async (localTree: ItemTree, remoteTree: ItemTree, modifyLocal: ActionListeners, modifyRemote: ActionListeners) => {
	const handledIds = new Set<string>();
	for (const [localPath, localItem] of localTree.items()) {
		if (handledIds.has(localItem.id)) continue;

		const id = localItem.id;

		if (remoteTree.hasId(id)) {
			const remoteItem = remoteTree.getAtId(id);
			const remotePath = remoteTree.pathFromId(id);

			if (!keysMatch(localItem, remoteItem, ['title', 'body', 'icon'])) {
				if (localItem.updated_time > remoteItem.updated_time) {
					await remoteTree.updateAtPath(remotePath, localItem, modifyRemote);
				} else {
					await localTree.updateAtPath(localPath, remoteItem, modifyLocal);
				}
			}

			if (dirname(remotePath) !== dirname(localPath)) {
				if (localItem.updated_time > remoteItem.updated_time) {
					await remoteTree.move(remotePath, localPath, modifyRemote);
				} else {
					await localTree.move(localPath, remotePath, modifyLocal);
				}
			}

			if (localItem.deleted_time && remoteItem) {
				await remoteTree.deleteAtPath(remotePath, modifyRemote);
				await localTree.deleteAtPath(localPath, noOpActionListeners);
			}
		} else if (!localItem.deleted_time) {
			await remoteTree.addItemAt(localPath, localItem, modifyRemote);
		}

		handledIds.add(localItem.id);
	}

	for (const [path, remoteItem] of remoteTree.items()) {
		if (!localTree.hasPath(path) && !handledIds.has(remoteItem.id)) {
			if (await Note.load(remoteItem.id)) {
				// TODO: What should be done with changes to the remote note (if any)?
				await remoteTree.deleteAtPath(path, modifyRemote);
			} else {
				await localTree.addItemAt(path, remoteItem, modifyLocal);
			}
		}
	}
};

const getNoteMd = async (note: NoteEntity) => {
	// const tagIds = [];//noteTags.filter(nt => nt.note_id === note.id).map(nt => nt.tag_id);
	const tagTitles: string[] = [];// tags.filter(t => tagIds.includes(t.id)).map(t => t.title);

	const toSave = { ...note };

	// Avoid including extra metadata TODO
	delete toSave.user_created_time;
	delete toSave.user_updated_time;
	delete toSave.updated_time;
	delete toSave.created_time;

	return serialize(toSave, tagTitles, { includeId: true });
};

enum FolderMirrorEventType {
	FullSync = 'fullSync',
	WatcherEvent = 'dirChange',
	DatabaseItemChange = 'dbChange',
	DatabaseItemDelete = 'dbDelete',
}

type LocalChangeEvent = { type: FolderMirrorEventType.DatabaseItemChange; id: string };
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

	public constructor(private baseFilePath: string, private baseFolderId: string) {
		if (baseFolderId === ALL_NOTES_FILTER_ID) {
			this.baseFolderId = '';
		}

		const baseItem = { id: this.baseFolderId, type_: ModelType.Folder };
		this.localTree_ = new ItemTree(baseItem);
		this.remoteTree_ = new ItemTree(baseItem);

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

		this.modifyLocalActions_ = {
			onAdd: async ({ item }) => {
				// Determine if it's new or not -- the item could be coming from a
				// different (unsynced) folder.
				const isNew = !item.id || !await BaseItem.loadItemById(item.id, { fields: ['id'] });
				debugLogger.debug('onAdd', item.title, isNew ? '[new]' : '[update]');

				let result;
				if (item.type_ === ModelType.Folder) {
					result = await Folder.save(item, { isNew });
				} else {
					result = await Note.save(item, { isNew });
				}
				return result;
			},
			onUpdate: async ({ item }) => {
				debugLogger.debug('onUpdate', item.title);

				if (item.type_ === ModelType.Folder) {
					await Folder.save(item, { isNew: false });
				} else {
					await Note.save(item, { isNew: false });
				}
			},
			onDelete: async ({ item }): Promise<void> => {
				debugLogger.debug('onDelete', item.title);

				if (item.type_ === ModelType.Note) {
					await Note.delete(item.id, { toTrash: true, sourceDescription: 'FileMirroringService' });
				} else {
					await Folder.delete(item.id, { toTrash: true, sourceDescription: 'FileMirroringService' });
				}
			},
			onMove: async ({ movedItem })=> {
				debugLogger.debug('onMove', movedItem.title);

				if (movedItem.type_ === ModelType.Folder) {
					await Folder.save({ ...movedItem });
				} else {
					await Note.save({ ...movedItem });
				}
			},
		};

		const onRemoteAddOrUpdate = async ({ path, item }: UpdateEvent) => {
			debugLogger.debug('remote.update', path);

			const fullPath = join(baseFilePath, path);
			if (item.type_ === ModelType.Folder) {
				await shim.fsDriver().mkdir(fullPath);
				await writeFolderInfo(fullPath, {
					id: item.id,
					icon: (item as FolderEntity).icon,
					title: item.title,
				});
			} else {
				await shim.fsDriver().writeFile(fullPath, await getNoteMd(item), 'utf8');
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
				await shim.fsDriver().move(join(baseFilePath, fromPath), join(baseFilePath, toPath));
			},
		};
	}

	public async onLocalItemDelete(id: string) {
		if (this.watcher_ && this.localTree_.hasId(id)) {
			this.actionQueue_.push(this.handleQueueAction, { type: FolderMirrorEventType.DatabaseItemDelete, id });
		}
	}

	public onLocalItemUpdate(item: FolderItem) {
		if (this.watcher_ && this.localTree_.hasId(item.parent_id)) {
			this.actionQueue_.push(this.handleQueueAction, { type: FolderMirrorEventType.DatabaseItemChange, id: item.id });
		}
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
		return new Promise<void>(resolve => {
			this.actionQueue_.push(
				async (event: ActionQueueEvent) => {
					await this.handleQueueAction(event);
					resolve();
				},
				{ type: FolderMirrorEventType.FullSync },
			);
		});
	}

	private async fullSyncTask() {
		const filePath = this.baseFilePath;
		const baseFolderId = this.baseFolderId;
		const folderFields = ['id', 'icon', 'title', 'parent_id', 'updated_time', 'deleted_time'];
		const isAllNotes = baseFolderId === '';

		const childrenFolders =
			isAllNotes ? await Folder.all({ fields: folderFields }) : await Folder.allChildrenFolders(baseFolderId, folderFields);
		const allFolders = await Folder.allAsTree(childrenFolders, { toplevelId: baseFolderId });

		this.localTree_.resetData();
		this.remoteTree_.resetData();

		const processFolders = async (basePath: string, parentId: string, folders: FolderEntityWithChildren[]) => {
			const folderIdToItemPath = makeItemPaths(basePath, folders);

			for (const folder of folders) {

				const folderPath = folderIdToItemPath.get(folder.id);
				await this.localTree_.addItemAt(folderPath, folder, noOpActionListeners);
				await processFolders(folderPath, folder.id, folder.children || []);
			}

			const noteFields = ['id', 'title', 'body', 'is_todo', 'parent_id', 'updated_time', 'deleted_time'];
			const childNotes = await Note.allByParentId(parentId, { fields: noteFields });
			const noteIdToItemPath = makeItemPaths(basePath, childNotes);

			for (const note of childNotes) {
				const notePath = noteIdToItemPath.get(note.id);
				await this.localTree_.addItemAt(notePath, note, noOpActionListeners);
			}
		};

		await processFolders('', baseFolderId, allFolders);

		const generatedIds: string[] = [];
		await fillRemoteTree(filePath, this.remoteTree_, {
			onAdd: async ({ item }) => {
				// Items need IDs to be added to the remoteTree.
				if (!item.id) {
					if (this.localTree_.hasPath(filePath)) {
						item = { ...item, id: this.localTree_.idAtPath(filePath) };
					} else {
						item = { ...item, id: uuid.create() };
						generatedIds.push(item.id);
					}
				}

				return item;
			},
		});

		for (const id of generatedIds) {
			const path = this.remoteTree_.pathFromId(id);
			const item = this.remoteTree_.getAtId(id);
			await this.remoteTree_.updateAtPath(path, item, this.modifyRemoteActions_);
		}

		await mergeTrees(this.localTree_, this.remoteTree_, this.modifyLocalActions_, this.modifyRemoteActions_);
	}

	private async databaseItemChangeTask(id: string) {
		const item: FolderItem = await BaseItem.loadItemById(id);
		if (item.type_ !== ModelType.Folder && item.type_ !== ModelType.Note) {
			throw new Error('databaseItemChangeTask only supports notes and folders');
		}

		debugLogger.debug('onLocalItemUpdate', item.title, 'in', this.localTree_.pathFromId(item.parent_id));

		if (this.localTree_.hasId(item.id)) {
			const localItem = this.localTree_.getAtId(item.id);
			if (keysMatch(localItem, item, ['title', 'body', 'icon', 'parent_id'])) {
				debugLogger.debug('onLocalItemUpdate/skip');
				return;
			}
		}
		await this.localTree_.processItem(item, noOpActionListeners);
		await this.remoteTree_.processItem(item, this.modifyRemoteActions_);
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

			debugLogger.debug('handleAdd at', path);
			debugLogger.group();

			// Add parent dirs
			await handleFileAdd(dirname(path));

			item = await this.localTree_.processItem(item, this.modifyLocalActions_);
			await this.remoteTree_.processItem(item, noOpActionListeners);

			debugLogger.groupEnd();
		};

		const fullPath = event.path;
		const path = relative(this.baseFilePath, fullPath);
		if (!path || path === '.') return;

		debugLogger.debug('event', event.type, path);
		debugLogger.group();

		try {
			if (await shim.fsDriver().exists(fullPath)) {
				const item = await itemAtPath(path);

				// Unsupported file type
				if (!item) return;

				if (event.type === DirectoryWatchEventType.Add) { // File created, renamed, or deleted
					await handleFileAdd(path, item);
				} else if (event.type === DirectoryWatchEventType.Change) {
					await this.localTree_.updateAtPath(path, item, this.modifyLocalActions_);
					await this.remoteTree_.updateAtPath(path, item, noOpActionListeners);
				} else if (event.type === DirectoryWatchEventType.Unlink) {
					throw new Error(`Path ${path} was marked as unlinked, but still exists.`);
				} else {
					const exhaustivenessCheck: never = event.type;
					return exhaustivenessCheck;
				}
			} else if (this.remoteTree_.hasPath(path)) {
				debugLogger.debug(`file doesn't exist at ${fullPath}. Delete`);
				await this.localTree_.deleteAtPath(path, this.modifyLocalActions_);
				await this.remoteTree_.deleteAtPath(path, noOpActionListeners);
			}
		} finally {
			debugLogger.groupEnd();
		}
	}

	private handleQueueAction = async (context: ActionQueueEvent) => {
		switch (context.type) {
		case FolderMirrorEventType.FullSync:
			return this.fullSyncTask();
		case FolderMirrorEventType.DatabaseItemChange:
			return this.databaseItemChangeTask(context.id);
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
}