import { DeleteOptions } from '../../BaseModel';
import { FolderEntity, NoteEntity } from '../../services/database/types';
import { getTrashFolderId } from '../../services/trash';
import Folder from '../Folder';
import Note from '../Note';

export default async (noteIds: string[], folderIds: string[], targetFolderId: string) => {
	const targetFolder = await Folder.load(targetFolderId, { fields: ['id', 'deleted_time'] });

	if (!targetFolder) throw new Error(`No such folder: ${targetFolderId}`);

	const defaultDeleteOptions: DeleteOptions = { toTrash: true };

	if (targetFolder.id !== getTrashFolderId()) {
		defaultDeleteOptions.toTrashParentId = targetFolder.id;
	}

	const notes: NoteEntity[] = await Note.byIds(noteIds, { fields: ['id', 'deleted_time'] });

	for (const note of notes) {
		if (targetFolder.deleted_time || targetFolder.id === getTrashFolderId()) {
			if (note.deleted_time && targetFolder.id === getTrashFolderId()) {
				await Note.delete(note.id, { ...defaultDeleteOptions, toTrashParentId: '' });
			} else {
				await Note.delete(note.id, defaultDeleteOptions);
			}
		} else {
			await Note.moveToFolder(note.id, targetFolderId);
		}
	}

	const folders: FolderEntity[] = await Folder.byIds(folderIds, { fields: ['id', 'deleted_time'] });

	for (const folder of folders) {
		if (targetFolder.deleted_time || targetFolder.id === getTrashFolderId()) {
			if (folder.deleted_time && targetFolder.id === getTrashFolderId()) {
				await Folder.delete(folder.id, { ...defaultDeleteOptions, toTrashParentId: '' });
			} else {
				await Folder.delete(folder.id, defaultDeleteOptions);
			}
		} else {
			await Folder.moveToFolder(folder.id, targetFolderId);
		}
	}
};
