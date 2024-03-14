import { getRestoreFolder } from '.';
import { ModelType } from '../../BaseModel';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { FolderEntity, NoteEntity } from '../database/types';
import { checkObjectHasProperties } from '@joplin/utils/object';

export interface RestoreItemsOptions {
	targetFolderId?: string;

	// Restore item to a special "Restore" folder if the item doesn't have a non-deleted parent to
	// be restored to.
	useRestoreFolder?: boolean;
}

const restoreItems = async (itemType: ModelType, itemsOrIds: NoteEntity[] | FolderEntity[] | string[], options: RestoreItemsOptions = null) => {
	if (!itemsOrIds.length) return;

	options = {
		targetFolderId: null,
		useRestoreFolder: false,
		...options,
	};

	const ModelClass = itemType === ModelType.Note ? Note : Folder;

	let items: NoteEntity[] | FolderEntity[] = [];

	if (typeof itemsOrIds[0] === 'string') {
		items = await ModelClass.byIds(itemsOrIds as string[], { fields: ['id', 'parent_id', 'deleted_time'] });
	} else {
		items = itemsOrIds as (NoteEntity[] | FolderEntity[]);
	}

	let restoreFolder: FolderEntity = null;

	for (const item of items) {
		checkObjectHasProperties(item, ['id', 'parent_id']);

		let itemParentId = item.parent_id;

		const parentItem = await Folder.load(item.parent_id, { fields: ['id', 'deleted_time'] });
		if (!parentItem || parentItem.deleted_time) {
			if (options.useRestoreFolder) {
				if (!restoreFolder) restoreFolder = await getRestoreFolder();
				itemParentId = restoreFolder.id;
			} else {
				itemParentId = '';
			}
		}

		if (options.targetFolderId !== null) itemParentId = options.targetFolderId;

		let toSave: FolderEntity | NoteEntity = null;

		if (itemType === ModelType.Note) {
			// We need to preview conflicts -- they can be trashed.
			toSave = await Note.preview(item.id, { excludeConflicts: false });
		} else {
			toSave = await Folder.load(item.id);
		}

		toSave = {
			...toSave,
			deleted_time: 0,
			updated_time: Date.now(),
			parent_id: itemParentId,
		};

		await ModelClass.save(toSave, {
			autoTimestamp: false,
		});

		if (itemType === ModelType.Folder) {
			const childrenFolderIds = await Folder.childrenIds(item.id, { includeDeleted: true });
			const childrenFolders: FolderEntity[] = await Folder.byIds(childrenFolderIds, { fields: ['id', 'parent_id', 'deleted_time'] });
			const deletedChildrenFolders = childrenFolders.filter(f => !!f.deleted_time);
			await restoreItems(ModelType.Folder, deletedChildrenFolders);

			const notes = await Folder.notes(item.id, {
				fields: ['id', 'parent_id'],
				includeDeleted: true,
			});

			await restoreItems(ModelType.Note, notes);
		}
	}
};

export default restoreItems;
