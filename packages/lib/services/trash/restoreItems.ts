import { FolderEntity, NoteEntity } from '../database/types';
import { checkObjectHasProperties } from '@joplin/utils/object';

export default async (items: NoteEntity[] | FolderEntity[], ModelClass: any) => {
	if (!items.length) return;

	for (const item of items) {
		checkObjectHasProperties(item, ['id', 'parent_id']);

		// Note updated when deleting item, then restoring from trash

		await ModelClass.save({
			id: item.id,
			deleted_time: 0,
			updated_time: Date.now(),
			parent_id: item.parent_id,
		}, {
			autoTimestamp: false,
		});
	}
};
