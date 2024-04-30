import { ModelType } from '../../BaseModel';
import { Stat } from '../../fs-driver-base';
import Folder, { FolderEntityWithChildren } from '../../models/Folder';
import Note from '../../models/Note';
import { friendlySafeFilename } from '../../path-utils';
import shim from '../../shim';
import { noteToFrontMatter, serialize } from '../../utils/frontMatter';
import { FolderEntity, NoteEntity, NoteTagEntity, TagEntity } from '../database/types';
import loadFolderInfo from './folderInfo/loadFolderInfo';
import { parse as parseFrontMatter } from '../../utils/frontMatter';
import { basename, dirname, join, normalize } from 'path';


type FolderItem = FolderEntity | NoteEntity;

type ItemTree = Map<string, FolderItem>;

interface Actions {
	onCreateFolderItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onUpdateFolderItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onDeleteFolderItem: (type: ModelType, path: string)=> Promise<void>;
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

const addStatToTree = async (stat: Stat, tree: ItemTree): Promise<FolderItem> => {
	const base: FolderItem = {
		created_time: stat.birthtime.getTime(),
		updated_time: stat.mtime.getTime(),
	};
	const parentPath = normalize(dirname(stat.path));
	if (tree.has(parentPath)) {
		base.parent_id = tree.get(parentPath).id;
	}

	if (stat.isDirectory()) {
		const folderInfo = await loadFolderInfo(stat.path);
		const result: FolderEntity = {
			...base,
			id: folderInfo.id,
		};
		if (folderInfo.icon) {
			result.icon = folderInfo.icon;
		}
		return result;
	} else {
		const fileContent = await shim.fsDriver().readFile(stat.path, 'utf8');
		const { metadata } = parseFrontMatter(fileContent);
		const result: NoteEntity = {
			...base,
			title: metadata.title ?? basename(stat.path, '.md'),
			author: metadata.author,

			source_url: metadata.source,
			todo_completed: metadata.todo_completed,
			todo_due: metadata.todo_due,
			latitude: metadata.latitude,
			longitude: metadata.longitude,
			altitude: metadata.altitude,

			body: metadata.body,
		};
		return result;
	}
};

const buildRemoteTree = async (basePath: string): Promise<ItemTree> => {
	const stats = await shim.fsDriver().readDirStats(basePath, { recursive: true });
	stats.sort((a, b) => a.path.length - b.path.length);
	const result: ItemTree = new Map();
	for (const stat of stats) {
		await addStatToTree(stat, result);
	}
	return result;
};

const mergeTrees = async (basePath: string, localTree: ItemTree, remoteTree: ItemTree, actions: Actions) => {
	for (const [path, item] of localTree.entries()) {
		const fullPath = join(basePath, path);
		const itemType = item.type_ ? item.type_ : ModelType.Note;

		if (!remoteTree.has(path)) {
			await actions.onCreateFolderItem(itemType, fullPath, item);
		} else {
			await actions.onUpdateFolderItem(itemType, fullPath, item);
		}
	}

	for (const [path, item] of remoteTree.entries()) {
		if (!path.startsWith(basePath)) throw new Error(`path ${path} should be a subfolder of basePath ${basePath}`);
		const subpath = path.substring(basePath.length + 1);
		if (!localTree.has(subpath)) {
			await actions.onDeleteFolderItem(item.type_ ?? ModelType.Note, subpath);
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
			return serialize(note, tagTitles);
		};

		await mergeTrees(filePath, localTree, remoteTree, {
			onCreateFolderItem: async (type, path, item) => {
				if (type === ModelType.Folder) {
					await shim.fsDriver().mkdir(path);
				} else {
					await shim.fsDriver().writeFile(path, await getNoteMd(item), 'utf8');
				}
			},
			onUpdateFolderItem: async (type, path, fileItem) => {
				if (type === ModelType.Folder) {
					await shim.fsDriver().mkdir(path);
				} else {
					const databaseNote = fileItem ? await Note.load(fileItem.id) : null;

					const overwriteFile = async () => {
						const md = await noteToFrontMatter(fileItem, []);
						await shim.fsDriver().writeFile(path, md, 'utf8');
					};
					const overwriteNote = async () => {
						await Note.save({
							...databaseNote,
							...fileItem,
						});
					};

					if (databaseNote) {
						if (databaseNote.updated_time > fileItem.updated_time) {
							await overwriteFile();
						} else {
							await overwriteNote();
						}

						if (databaseNote.deleted_time) {
							await shim.fsDriver().remove(path);
						}
					} else {
						await overwriteFile();
					}
				}
			},
			onDeleteFolderItem: async (_type, path) => {
				await shim.fsDriver().remove(path);
			},
		});
	}

}
