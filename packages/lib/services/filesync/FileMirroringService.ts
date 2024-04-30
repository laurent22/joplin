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
import { basename, dirname, join, normalize } from 'path';
import writeFolderInfo from './folderInfo/writeFolderInfo';


type FolderItem = FolderEntity | NoteEntity;

type ItemTree = Map<string, FolderItem>;

interface Actions {
	onCreateRemoteItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onUpdateItem: (type: ModelType, path: string, localItem: FolderItem|null, remoteItem: FolderItem)=> Promise<void>;
}

const makeItemPaths = (basePath: string, items: FolderItem[]) => {
	const output: Map<string, string> = new Map();
	const existingFilenames: string[] = [];

	for (const item of items) {
		const isFolder = item.type_ === ModelType.Folder;
		const basename = friendlySafeFilename(item.title);
		let filename = isFolder ? basename : `${basename}.md`;
		let counter = 0;
		while (true) {
			if (counter) filename = `${basename} (${counter}).md`;
			if (!existingFilenames.includes(filename)) break;
			counter++;
		}
		output.set(item.id, basePath ? join(basePath, filename) : filename);
		existingFilenames.push(filename);
	}

	return output;
};

const addStatToTree = async (baseFolder: string, stat: Stat, tree: ItemTree): Promise<void> => {
	const base: FolderItem = {
		updated_time: stat.mtime.getTime(),
	};
	const parentPath = normalize(dirname(stat.path));
	if (tree.has(parentPath)) {
		base.parent_id = tree.get(parentPath).id;
	}

	if (stat.isDirectory()) {
		const folderInfo = await loadFolderInfo(join(baseFolder, stat.path));
		if (folderInfo.id && !Folder.load(folderInfo.id)) {
			delete folderInfo.id;
		}
		const result: FolderEntity = {
			...base,
			title: folderInfo.title,
			id: folderInfo.id,
			type_: ModelType.Folder,
		};
		if (folderInfo.icon) {
			result.icon = folderInfo.icon;
		}
		tree.set(stat.path, result);
	} else {
		const fileContent = await shim.fsDriver().readFile(join(baseFolder, stat.path), 'utf8');
		const { metadata } = parseFrontMatter(fileContent);

		const result: NoteEntity = {
			...base,
			...metadata,

			title: metadata.title ?? basename(stat.path, '.md'),
			body: metadata.body ?? '',

			type_: ModelType.Note,
		};
		tree.set(stat.path, result);
	}
};

const buildRemoteTree = async (basePath: string): Promise<ItemTree> => {
	const stats = await shim.fsDriver().readDirStats(basePath, { recursive: true });
	stats.sort((a, b) => a.path.length - b.path.length);
	const result: ItemTree = new Map();
	for (const stat of stats) {
		await addStatToTree(basePath, stat, result);
	}
	return result;
};

const mergeTrees = async (basePath: string, localTree: ItemTree, remoteTree: ItemTree, actions: Actions) => {
	for (const [path, item] of localTree.entries()) {
		const fullPath = join(basePath, path);
		const itemType = item.type_ ? item.type_ : ModelType.Note;

		if (!remoteTree.has(path)) {
			await actions.onCreateRemoteItem(itemType, fullPath, item);
		} else {
			const remoteItem = remoteTree.get(path);
			await actions.onUpdateItem(itemType, fullPath, item, remoteItem);
		}
	}

	for (const [path, remoteItem] of remoteTree.entries()) {
		const fullPath = join(basePath, path);

		if (!localTree.has(path)) {
			await actions.onUpdateItem(remoteItem.type_, fullPath, null, remoteItem);
		}
	}
};

export default class {

	public async syncDir(filePath: string, noteTags: NoteTagEntity[], tags: TagEntity[]) {
		const allFolders = await Folder.allAsTree(null, { fields: ['id', 'title', 'parent_id'] });
		const allNotes: NoteEntity[] = await Note.all({ fields: ['id', 'title', 'body', 'is_todo', 'parent_id'] });

		const localTree: ItemTree = new Map();

		const processFolders = (basePath: string, folders: FolderEntityWithChildren[], notes: NoteEntity[]) => {
			const idToItemPath = makeItemPaths(basePath, folders.concat(notes));

			for (const folder of folders) {
				const folderPath = idToItemPath.get(folder.id);
				localTree.set(folderPath, folder);
				const folderNotes = allNotes.filter(n => n.parent_id === folder.id);
				processFolders(folderPath, folder.children || [], folderNotes);
			}

			for (const note of notes) {
				const notePath = idToItemPath.get(note.id);
				localTree.set(notePath, note);
			}
		};

		processFolders('', allFolders, allNotes.filter(n => !n.parent_id));

		const remoteTree: ItemTree = await buildRemoteTree(filePath);

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

		await mergeTrees(filePath, localTree, remoteTree, {
			onCreateRemoteItem: async (type, path, item) => {
				if (type === ModelType.Folder) {
					await shim.fsDriver().mkdir(path);
				} else {
					await shim.fsDriver().writeFile(path, await getNoteMd(item), 'utf8');
				}
			},
			onUpdateItem: async (type, path, localItem, remoteItem) => {
				const isNew = !localItem;
				if (type === ModelType.Folder) {
					const updateRemote = async (sourceData: FolderEntity) => {
						await writeFolderInfo(path, {
							id: sourceData.id,
							icon: sourceData.icon,
							title: sourceData.title,
						});
					};
					const updateLocal = async () => {
						const toSave = { ...remoteItem };
						delete toSave.updated_time;
						const savedFolder = await Folder.save(toSave, { isNew });
						if (savedFolder.id !== remoteItem.id) {
							await updateRemote(savedFolder);
						}
					};

					if (localItem) {
						if (localItem.title !== remoteItem.title) {
							if (localItem.updated_time > remoteItem.updated_time) {
								await updateRemote(localItem);
							} else {
								await updateLocal();
							}
						}
					} else {
						await updateLocal();
					}
				} else {
					const overwriteRemote = async (sourceNote: NoteEntity) => {
						await shim.fsDriver().writeFile(path, await getNoteMd(sourceNote), 'utf8');
					};
					const overwriteLocal = async () => {
						const toSave = {
							...localItem,
							...remoteItem,
						};
						// Change the updated_time when saving to reflect that, in Joplin,
						// the note was just updated.
						delete toSave.updated_time;
						const savedNote = await Note.save(toSave, { isNew });

						// Handle the case where the file item has an invalid ID.
						if (savedNote.id !== remoteItem.id) {
							await overwriteRemote(savedNote);
						}
					};

					if (localItem) {
						if (localItem.updated_time > remoteItem.updated_time) {
							await overwriteRemote(localItem);
						} else {
							await overwriteLocal();
						}

						if (localItem.deleted_time) {
							await shim.fsDriver().remove(path);
						}
					} else {
						await overwriteLocal();
					}
				}
			},
		});
	}

}
