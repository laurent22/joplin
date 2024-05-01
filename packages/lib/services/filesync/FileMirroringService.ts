import { ModelType } from '../../BaseModel';
import { Stat } from '../../fs-driver-base';
import Folder, { FolderEntityWithChildren } from '../../models/Folder';
import Note from '../../models/Note';
import { friendlySafeFilename } from '../../path-utils';
import shim from '../../shim';
import { serialize } from '../../utils/frontMatter';
import { FolderEntity, NoteEntity } from '../database/types';
import loadFolderInfo from './folderInfo/loadFolderInfo';
import { parse as parseFrontMatter } from '../../utils/frontMatter';
import { basename, dirname, extname, join, normalize } from 'path';
import writeFolderInfo from './folderInfo/writeFolderInfo';
const { ALL_NOTES_FILTER_ID } = require('../../reserved-ids.js');

type FolderItem = FolderEntity | NoteEntity;

type ItemTree = Map<string, FolderItem>;
type IdToPath = Map<string, string>;

interface Actions {
	onUpdateLocalItem: (type: ModelType, existingLocalItem: FolderItem, remoteItem: FolderItem, isNew: boolean)=> Promise<FolderItem>;
	onUpdateRemoteItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onDeleteLocalItem: (type: ModelType, localItem: FolderItem)=> Promise<void>;
	onDeleteRemoteItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onMoveRemoteItem: (type: ModelType, fromPath: string, toPath: string)=> Promise<void>;
	onMoveLocalItem: (type: ModelType, item: FolderItem, parentId: string)=> Promise<void>;
}

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

const addStatToRemoteTree = async (baseFolderPath: string, baseFolderId: string, stat: Stat, remoteTree: ItemTree, remoteIdToPath: IdToPath): Promise<void> => {
	const base: FolderItem = {
		updated_time: stat.mtime.getTime(),
	};
	const parentPath = normalize(dirname(stat.path));
	if (remoteTree.has(parentPath)) {
		base.parent_id = remoteTree.get(parentPath).id;
	} else if (parentPath === '.') {
		base.parent_id = baseFolderId;
	}

	const isFolder = stat.isDirectory();

	let result: FolderItem;
	if (isFolder) {
		const folderInfo = await loadFolderInfo(join(baseFolderPath, stat.path));
		if (folderInfo.id && !Folder.load(folderInfo.id)) {
			delete folderInfo.id;
		}
		const item: FolderEntity = {
			...base,
			title: folderInfo.title,
			id: folderInfo.id,
			type_: ModelType.Folder,
		};
		if (folderInfo.icon) {
			item.icon = folderInfo.icon;
		}
		result = item;
	} else {
		if (extname(stat.path) !== '.md') return;

		const fileContent = await shim.fsDriver().readFile(join(baseFolderPath, stat.path), 'utf8');
		const { metadata } = parseFrontMatter(fileContent);

		result = {
			...base,
			...metadata,

			// Use || to handle the case where the title is empty, which can happen for empty
			// frontmatter.
			title: metadata.title || basename(stat.path, '.md'),
			body: metadata.body ?? '',

			type_: ModelType.Note,
		};
	}

	remoteTree.set(stat.path, result);
	if (result.id) {
		remoteIdToPath.set(result.id, stat.path);
	}
};

const buildRemoteTree = async (basePath: string, baseFolderId: string) => {
	const stats = await shim.fsDriver().readDirStats(basePath, { recursive: true });

	// Sort so that parent folders are visited before child folders.
	stats.sort((a, b) => a.path.length - b.path.length);

	const remoteTree: ItemTree = new Map();
	const remoteIdToItem: IdToPath = new Map();
	for (const stat of stats) {
		await addStatToRemoteTree(basePath, baseFolderId, stat, remoteTree, remoteIdToItem);
	}
	return { remoteTree, remoteIdToItem };
};

const mergeTrees = async (basePath: string, localTree: ItemTree, remoteTree: ItemTree, remoteIdToPath: IdToPath, actions: Actions) => {
	const updateItem = async (type: ModelType, remotePath: string, localItem: FolderItem|null, remoteItem: FolderItem|null) => {
		const isNew = !localItem;
		const updateRemote = async (sourceData: FolderEntity) => {
			await actions.onUpdateRemoteItem(type, remotePath, sourceData);
		};
		const updateLocal = async () => {
			const updatedItem = await actions.onUpdateLocalItem(type, localItem, remoteItem, isNew);
			if (updatedItem.id !== localItem?.id) {
				await updateRemote(updatedItem);
			}
		};

		if (localItem) {
			const keysMatch = (key: (keyof FolderEntity)|(keyof NoteEntity)) => {
				if (key in localItem !== key in remoteItem) {
					return false;
				}
				if (key in localItem) {
					return localItem[key as keyof typeof localItem] === remoteItem[key as keyof typeof remoteItem];
				}
				return true;
			};
			if (
				!keysMatch('title') || !keysMatch('body') || !keysMatch('icon')
			) {
				if (localItem.updated_time > remoteItem.updated_time) {
					await updateRemote(localItem);
				} else {
					await updateLocal();
				}
			}

			if (localItem.deleted_time && remoteItem) {
				await actions.onDeleteRemoteItem(type, remotePath, remoteItem);
			}
		} else {
			await updateLocal();
		}
	};

	const handledIds = new Set<string>();
	for (const [path, localItem] of localTree.entries()) {
		const fullLocalPath = join(basePath, path);
		const itemType = localItem.type_ ? localItem.type_ : ModelType.Note;

		if (!remoteTree.has(path)) {
			const remotePath = remoteIdToPath.get(localItem.id);

			// New item
			if (!remotePath) {
				// Skip if deleted both locally and remotely
				if (!localItem.deleted_time) {
					await actions.onUpdateRemoteItem(itemType, fullLocalPath, localItem);
				}
			} else {
				const remoteItem = remoteTree.get(remotePath);
				const fullRemotePath = join(basePath, remotePath);

				// Moved item
				if (remoteItem.parent_id !== localItem.parent_id) {
					if (remoteItem.updated_time < localItem.updated_time) {
						await actions.onMoveRemoteItem(itemType, fullRemotePath, fullLocalPath);
					} else {
						await actions.onMoveLocalItem(itemType, localItem, remoteItem.parent_id);
					}
				}
				// Otherwise, the item may have a custom filename -- don't rename.
				// TODO: Do we want to rename in that case?

				await updateItem(itemType, fullRemotePath, localItem, remoteItem);
			}
		} else {
			const remoteItem = remoteTree.get(path);
			const fullRemotePath = fullLocalPath;
			await updateItem(itemType, fullRemotePath, localItem, remoteItem);
		}

		handledIds.add(localItem.id);
	}

	for (const [path, remoteItem] of remoteTree.entries()) {
		const fullPath = join(basePath, path);

		if (!localTree.has(path) && !handledIds.has(remoteItem.id)) {
			await updateItem(remoteItem.type_, fullPath, null, remoteItem);
		}
	}
};

export default class {

	public async syncDir(filePath: string, baseFolderId: string) {
		const folderFields = ['id', 'icon', 'title', 'parent_id', 'updated_time', 'deleted_time'];
		const isAllNotes = baseFolderId === ALL_NOTES_FILTER_ID || baseFolderId === '';
		if (isAllNotes) baseFolderId = '';

		const childrenFolders =
			isAllNotes ? await Folder.all({ fields: folderFields }) : await Folder.allChildrenFolders(baseFolderId, folderFields);
		const allFolders = await Folder.allAsTree(childrenFolders, { toplevelId: baseFolderId });

		const localTree: ItemTree = new Map();
		const localIdToItem: Map<string, FolderItem> = new Map();

		const processFolders = async (basePath: string, parentId: string, folders: FolderEntityWithChildren[]) => {
			const folderIdToItemPath = makeItemPaths(basePath, folders);

			for (const folder of folders) {
				localIdToItem.set(folder.id, folder);

				const folderPath = folderIdToItemPath.get(folder.id);
				localTree.set(folderPath, folder);
				await processFolders(folderPath, folder.id, folder.children || []);
			}

			const noteFields = ['id', 'title', 'body', 'is_todo', 'parent_id', 'updated_time', 'deleted_time'];
			const childNotes = await Note.allByParentId(parentId, { fields: noteFields });
			const noteIdToItemPath = makeItemPaths(basePath, childNotes);

			for (const note of childNotes) {
				if (localIdToItem.has(note.id)) throw new Error(`Refusing to process note with ID ${note.id} twice.`);
				localIdToItem.set(note.id, note);

				const notePath = noteIdToItemPath.get(note.id);
				localTree.set(notePath, note);
			}
		};

		await processFolders('', baseFolderId, allFolders);

		const { remoteTree, remoteIdToItem } = await buildRemoteTree(filePath, baseFolderId);

		const getNoteMd = async (note: NoteEntity) => {
			// const tagIds = [];//noteTags.filter(nt => nt.note_id === note.id).map(nt => nt.tag_id);
			const tagTitles: string[] = [];// tags.filter(t => tagIds.includes(t.id)).map(t => t.title);

			const toSave = { ...note };

			// Avoid including extra metadata
			if (toSave.user_created_time === toSave.created_time) {
				delete toSave.user_created_time;
			}
			if (toSave.user_updated_time === toSave.updated_time) {
				delete toSave.user_updated_time;
			}

			return serialize(toSave, tagTitles, { includeId: true });
		};

		await mergeTrees(filePath, localTree, remoteTree, remoteIdToItem, {
			onUpdateRemoteItem: async (type, path, item) => {
				if (type === ModelType.Folder) {
					await shim.fsDriver().mkdir(path);
					await writeFolderInfo(path, {
						id: item.id,
						icon: (item as FolderEntity).icon,
						title: item.title,
					});
				} else {
					await shim.fsDriver().writeFile(path, await getNoteMd(item), 'utf8');
				}
			},
			onUpdateLocalItem: async (type, existingLocalItem, remoteItem, isNew): Promise<FolderItem> => {
				if (type === ModelType.Folder) {
					const toSave = { ...remoteItem };
					delete toSave.updated_time;
					return await Folder.save(toSave, { isNew });
				} else {
					const toSave = {
						...existingLocalItem,
						...remoteItem,
					};
					// Change the updated_time when saving to reflect that, in Joplin,
					// the note was just updated.
					delete toSave.updated_time;
					return await Note.save(toSave, { isNew });
				}
			},
			onDeleteLocalItem: async (type, localItem): Promise<void> => {
				if (type === ModelType.Note) {
					await Note.delete(localItem.id, { toTrash: true, sourceDescription: 'FileMirroringService' });
				} else {
					await Folder.delete(localItem.id, { toTrash: true, sourceDescription: 'FileMirroringService' });
				}
			},
			onDeleteRemoteItem: async (_type, path, _item): Promise<void> => {
				await shim.fsDriver().remove(path);
			},
			onMoveRemoteItem: async (_type: ModelType, fromPath: string, toPath: string)=> {
				await shim.fsDriver().move(fromPath, toPath);
			},
			onMoveLocalItem: async (type: ModelType, item: FolderItem, parentId: string)=> {
				if (type === ModelType.Folder) {
					await Folder.save({ ...item, parent_id: parentId });
				} else {
					await Note.save({ ...item, parent_id: parentId });
				}
			},
		});
	}
}
