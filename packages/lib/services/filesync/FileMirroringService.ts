import { ModelType } from '../../BaseModel';
import Folder, { FolderEntityWithChildren } from '../../models/Folder';
import Note from '../../models/Note';
import { friendlySafeFilename } from '../../path-utils';
import shim from '../../shim';
import { noteToFrontMatter, serialize } from '../../utils/frontMatter';
import { FolderEntity, NoteEntity, NoteTagEntity, TagEntity } from '../database/types';

type FolderItem = FolderEntity | NoteEntity;

type ItemTree = Record<string, FolderItem>;

interface Actions {
	onCreateFolderItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onUpdateFolderItem: (type: ModelType, path: string, item: FolderItem)=> Promise<void>;
	onDeleteFolderItem: (type: ModelType, path: string)=> Promise<void>;
}

const makeItemPaths = (basePath: string, items: FolderItem[]) => {
	const output: Record<string, string> = {};
	const existingFilenames: string[] = [];

	for (const item of items) {
		const isFolder = item.type_ === ModelType.Folder;
		const basename = friendlySafeFilename(item.title);
		const filename = isFolder ? basename : `${basename}.md`;
		let counter = 0;
		while (true) {
			if (counter) `${basename} (${counter})`;
			if (!existingFilenames.includes(filename)) break;
			counter++;
		}
		output[item.id] = basePath ? `${basePath}/${filename}` : filename;
		existingFilenames.push(filename);
	}

	return output;
};

const mergeTrees = async (basePath: string, localTree: ItemTree, remoteTree: ItemTree, actions: Actions) => {
	for (const [path, item] of Object.entries(localTree)) {
		const fullPath = `${basePath}/${path}`;
		const itemType = item.type_ ? item.type_ : ModelType.Note;

		if (!remoteTree[path]) {
			await actions.onCreateFolderItem(itemType, fullPath, item);
		} else {
			await actions.onUpdateFolderItem(itemType, fullPath, item);
		}
	}
};

export default class {

	public async syncDir(filePath: string, noteTags: NoteTagEntity[], tags: TagEntity[]) {
		const allFolders = await Folder.allAsTree(null, { fields: ['id', 'title', 'parent_id'] });
		const allNotes: NoteEntity[] = await Note.all({ fields: ['id', 'title', 'parent_id'] });

		const localTree: ItemTree = {};

		const processFolders = (basePath: string, folders: FolderEntityWithChildren[], notes: NoteEntity[]) => {
			const itemPaths = makeItemPaths(basePath, folders.concat(notes));

			for (const folder of folders) {
				const folderPath = itemPaths[folder.id];
				localTree[folderPath] = folder;
				const folderNotes = allNotes.filter(n => n.parent_id === folder.id);
				processFolders(folderPath, folder.children || [], folderNotes);
			}

			for (const note of notes) {
				const notePath = itemPaths[note.id];
				localTree[notePath] = note;
			}
		};

		processFolders('', allFolders, allNotes.filter(n => !n.parent_id));

		const remoteTree: ItemTree = {};

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
			onUpdateFolderItem: async (type, path, item) => {
				if (type === ModelType.Folder) {
					await shim.fsDriver().mkdir(path);
				} else {
					const md = await noteToFrontMatter(item, []);
					await shim.fsDriver().writeFile(path, md, 'utf8');
				}
			},
			onDeleteFolderItem: async (type, path) => {

			},
		});

		// filePath = '/Users/laurent/src/joplin-2.13/readme/apps';

		// const stats = await shim.fsDriver().readDirStats(filePath, { recursive: true });

		// for (const stat of stats) {

		// }
	}

}
