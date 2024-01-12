import BaseItem from '../../models/BaseItem';
import Folder from '../../models/Folder';
import Note from '../../models/Note';

export default async () => {
	const result = await BaseItem.allItemsInTrash();
	await Note.batchDelete(result.noteIds);

	for (const folderId of result.folderIds) {
		await Folder.delete(folderId, { deleteChildren: false });
	}
};
