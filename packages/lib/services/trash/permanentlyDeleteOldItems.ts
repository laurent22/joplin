import Logger from '@joplin/utils/Logger';
import Folder from '../../models/Folder';
import Setting from '../../models/Setting';
import Note from '../../models/Note';
import { Day } from '@joplin/utils/time';

const logger = Logger.create('permanentlyDeleteOldData');

export default async (ttl: number = null) => {
	ttl = ttl === null ? Setting.value('trash.ttlDays') * Day : ttl;

	if (!Setting.value('trash.autoDeletionEnabled')) {
		logger.info('Auto-deletion is not enabled - skipping deletion');
		return;
	}

	const result = await Folder.trashItemsOlderThan(ttl);
	logger.info('Found items to permanently delete:', result);

	await Note.batchDelete(result.noteIds);

	// We only auto-delete folders if they are empty.
	for (const folderId of result.folderIds) {
		const noteIds = await Folder.noteIds(folderId, { includeDeleted: true });
		if (!noteIds.length) await Folder.delete(folderId);
	}
};
