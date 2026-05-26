import { DeleteOptions, ModelType } from '../../BaseModel';
import { FolderEntity, NoteEntity } from '../../services/database/types';
import { getTrashFolderId } from '../../services/trash';
import restoreItems from '../../services/trash/restoreItems';
import Folder from '../Folder';
import Note from '../Note';

export interface FolderDropLocation {
	location: 'nest' | 'before' | 'after';
}

const rootFolder = {
	id: '',
	deleted_time: 0,
	type_: ModelType.Folder,
};

export default async (noteIds: string[], folderIds: string[], targetFolderId: string, folderDropLocation: FolderDropLocation = { location: 'nest' }) => {
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
		const itemById = new Map(items.map(item => [item.id, item] as const));
		const orderedItemIds = itemType === ModelType.Folder && folderDropLocation.location !== 'before'
			? [...itemIds].reverse()
			: itemIds;

		for (const itemId of orderedItemIds) {
			const item = itemById.get(itemId);
			if (!item) continue;

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
				if (itemType === ModelType.Folder) {
					await Folder.moveToFolder(item.id, targetFolderId, folderDropLocation);
				} else {
					await ModelClass.moveToFolder(item.id, targetFolderId);
				}
			}
		}
	}

	await processList(ModelType.Note, noteIds);
	await processList(ModelType.Folder, folderIds);
};
