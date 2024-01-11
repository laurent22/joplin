import { ModelType } from '../../BaseModel';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { FolderEntity, NoteEntity } from '../database/types';
import { checkObjectHasProperties } from '@joplin/utils/object';

const restoreItems = async (itemType: ModelType, items: NoteEntity[] | FolderEntity[]) => {
	if (!items.length) return;

	for (const item of items) {
		checkObjectHasProperties(item, ['id', 'parent_id']);

		const ModelClass = itemType === ModelType.Note ? Note : Folder;

		await ModelClass.save({
			id: item.id,
			deleted_time: 0,
			updated_time: Date.now(),
			parent_id: item.parent_id,
		}, {
			autoTimestamp: false,
		});

		if (itemType === ModelType.Folder) {
			const childrenFolderIds = await Folder.childrenIds(item.id);
			const childrenFolders: FolderEntity[] = await Folder.byIds(childrenFolderIds, { fields: ['id', 'parent_id', 'deleted_time'] });
			const deletedChildrenFolders = childrenFolders.filter(f => !!f.deleted_time);
			await restoreItems(ModelType.Folder, deletedChildrenFolders);

			const notes = await Folder.notes(item.id, { fields: ['id', 'parent_id'] });
			await restoreItems(ModelType.Note, notes);
		}
	}
};

export default restoreItems;
