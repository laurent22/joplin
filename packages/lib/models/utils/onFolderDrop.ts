import { DeleteOptions, ModelType } from '../../BaseModel';
import { FolderEntity, NoteEntity } from '../../services/database/types';
import { getTrashFolderId } from '../../services/trash';
import restoreItems from '../../services/trash/restoreItems';
import Folder from '../Folder';
import Note from '../Note';

const rootFolder = {
	id: '',
	deleted_time: 0,
	type_: ModelType.Folder,
};

export default async (noteIds: string[], folderIds: string[], targetFolderId: string) => {
	let targetFolder: FolderEntity;
	if (targetFolderId !== '') {
		targetFolder = await Folder.load(targetFolderId, { fields: ['id', 'deleted_time'] });
	} else {
		targetFolder = rootFolder;
	}

	if (!targetFolder) throw new Error(`No such folder: ${targetFolderId}`);

	const defaultDeleteOptions: DeleteOptions = { toTrash: true, sourceDescription: 'onFolderDrop' };

	if (targetFolder.id !== getTrashFolderId()) {
		defaultDeleteOptions.toTrashParentId = targetFolder.id;
	}

	async function processList<T extends NoteEntity | FolderEntity>(itemType: ModelType, itemIds: string[]) {
		const ModelClass = itemType === ModelType.Note ? Note : Folder;
		const items: T[] = await ModelClass.byIds(itemIds, { fields: ['id', 'deleted_time', 'parent_id'] });

		for (const item of items) {
			if (item.id === targetFolder.id) continue;

			if (targetFolder.deleted_time || targetFolder.id === getTrashFolderId()) {
				if (item.deleted_time && targetFolder.id === getTrashFolderId()) {
					await ModelClass.delete(item.id, { ...defaultDeleteOptions, toTrashParentId: '' });
				} else {
					await ModelClass.delete(item.id, defaultDeleteOptions);
				}
			} else if (item.deleted_time && !targetFolder.deleted_time) {
				await restoreItems(itemType, [item], { targetFolderId: targetFolder.id });
			} else {
				await ModelClass.moveToFolder(item.id, targetFolderId);
			}
		}
	}

	await processList(ModelType.Note, noteIds);
	await processList(ModelType.Folder, folderIds);
};
