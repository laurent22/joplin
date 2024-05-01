import { ModelType } from '../../BaseModel';
import { Stat } from '../../fs-driver-base';
import Folder, { FolderEntityWithChildren } from '../../models/Folder';
import Note from '../../models/Note';
import { friendlySafeFilename } from '../../path-utils';
import shim from '../../shim';
import { serialize } from '../../utils/frontMatter';
import { FolderEntity, NoteEntity, NoteTagEntity, TagEntity } from '../database/types';
import loadFolderInfo from './folderInfo/loadFolderInfo';
import { parse as parseFrontMatter } from '../../utils/frontMatter';
import { basename, dirname, extname, join, normalize } from 'path';
import writeFolderInfo from './folderInfo/writeFolderInfo';

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

const addStatToRemoteTree = async (baseFolder: string, stat: Stat, remoteTree: ItemTree, remoteIdToPath: IdToPath): Promise<void> => {
	const base: FolderItem = {
		updated_time: stat.mtime.getTime(),
	};
	const parentPath = normalize(dirname(stat.path));
	if (remoteTree.has(parentPath)) {
		base.parent_id = remoteTree.get(parentPath).id;
	}

	const isFolder = stat.isDirectory();

	let result: FolderItem;
	if (isFolder) {
		const folderInfo = await loadFolderInfo(join(baseFolder, stat.path));
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

		const fileContent = await shim.fsDriver().readFile(join(baseFolder, stat.path), 'utf8');
		const { metadata } = parseFrontMatter(fileContent);

		result = {
			...base,
			...metadata,

			title: metadata.title ?? basename(stat.path, '.md'),
			body: metadata.body ?? '',

			type_: ModelType.Note,
		};
	}

	remoteTree.set(stat.path, result);
	if (result.id) {
		remoteIdToPath.set(result.id, stat.path);
	}
};

const buildRemoteTree = async (basePath: string) => {
	const stats = await shim.fsDriver().readDirStats(basePath, { recursive: true });

	// Sort so that parent folders are visited before child folders.
	stats.sort((a, b) => a.path.length - b.path.length);

	const remoteTree: ItemTree = new Map();
	const remoteIdToItem: IdToPath = new Map();
	for (const stat of stats) {
		await addStatToRemoteTree(basePath, stat, remoteTree, remoteIdToItem);
	}
	return { remoteTree, remoteIdToItem };
};

const mergeTrees = async (basePath: string, localTree: ItemTree, remoteTree: ItemTree, remoteIdToPath: IdToPath, actions: Actions) => {
	const updateItem = async (type: ModelType, path: string, localItem: FolderItem|null, remoteItem: FolderItem|null) => {
		const isNew = !localItem;
		const updateRemote = async (sourceData: FolderEntity) => {
			await actions.onUpdateRemoteItem(type, path, sourceData);
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
				await actions.onDeleteRemoteItem(type, path, remoteItem);
			}
		} else {
			await updateLocal();
		}
	};

	const handledIds = new Set<string>();
	for (const [path, item] of localTree.entries()) {
		const fullPath = join(basePath, path);
		const itemType = item.type_ ? item.type_ : ModelType.Note;

		if (!remoteTree.has(path)) {
			const remotePath = remoteIdToPath.get(item.id);

			// New item
			if (!remotePath) {
				await actions.onUpdateRemoteItem(itemType, fullPath, item);
			} else {
				// Moved item
				const remoteItem = remoteTree.get(remotePath);
				if (remoteItem.updated_time < item.updated_time) {
					await actions.onMoveRemoteItem(itemType, remotePath, path);
				} else {
					await actions.onMoveLocalItem(itemType, item, remoteItem.parent_id);
				}
				await updateItem(itemType, fullPath, item, remoteItem);
			}
		} else {
			const remoteItem = remoteTree.get(path);
			await updateItem(itemType, fullPath, item, remoteItem);
		}

		handledIds.add(item.id);
	}

	for (const [path, remoteItem] of remoteTree.entries()) {
		const fullPath = join(basePath, path);

		if (!localTree.has(path) && !handledIds.has(remoteItem.id)) {
			await updateItem(remoteItem.type_, fullPath, null, remoteItem);
		}
	}
};

export default class {

	public async syncDir(filePath: string, noteTags: NoteTagEntity[], tags: TagEntity[]) {
		const allFolders = await Folder.allAsTree(null, { fields: ['id', 'title', 'parent_id'] });
		const allNotes: NoteEntity[] = await Note.all({ fields: ['id', 'title', 'body', 'is_todo', 'parent_id'] });

		const localTree: ItemTree = new Map();
		const localIdToItem: Map<string, FolderItem> = new Map();

		const processFolders = (basePath: string, folders: FolderEntityWithChildren[], notes: NoteEntity[]) => {
			const idToItemPath = makeItemPaths(basePath, folders.concat(notes));

			for (const folder of folders) {
				localIdToItem.set(folder.id, folder);

				const folderPath = idToItemPath.get(folder.id);
				localTree.set(folderPath, folder);
				const folderNotes = allNotes.filter(n => n.parent_id === folder.id);
				processFolders(folderPath, folder.children || [], folderNotes);
			}

			for (const note of notes) {
				localIdToItem.set(note.id, note);

				const notePath = idToItemPath.get(note.id);
				localTree.set(notePath, note);
			}
		};

		processFolders('', allFolders, allNotes.filter(n => !n.parent_id));

		const { remoteTree, remoteIdToItem } = await buildRemoteTree(filePath);

		const getNoteMd = async (note: NoteEntity) => {
			const tagIds = noteTags.filter(nt => nt.note_id === note.id).map(nt => nt.tag_id);
			const tagTitles = tags.filter(t => tagIds.includes(t.id)).map(t => t.title);

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
					await Note.delete(localItem.id);
				} else {
					await Folder.delete(localItem.id);
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
