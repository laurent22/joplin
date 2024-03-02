import Logger from '@joplin/utils/Logger';
import Folder from '../../models/Folder';
import Setting from '../../models/Setting';
import Note from '../../models/Note';
import { Day, Hour } from '@joplin/utils/time';
import shim from '../../shim';

const logger = Logger.create('permanentlyDeleteOldData');

const permanentlyDeleteOldItems = async (ttl: number = null) => {
	ttl = ttl === null ? Setting.value('trash.ttlDays') * Day : ttl;

	logger.info(`Processing items older than ${ttl}ms...`);

	if (!Setting.value('trash.autoDeletionEnabled')) {
		logger.info('Auto-deletion is not enabled - skipping');
		return;
	}

	const result = await Folder.trashItemsOlderThan(ttl);
	logger.info('Items to permanently delete:', result);

	await Note.batchDelete(result.noteIds);

	// We only auto-delete folders if they are empty.
	for (const folderId of result.folderIds) {
		const noteIds = await Folder.noteIds(folderId, { includeDeleted: true });
		if (!noteIds.length) {
			logger.info(`Deleting empty folder: ${folderId}`);
			await Folder.delete(folderId);
		} else {
			logger.info(`Skipping non-empty folder: ${folderId}`);
		}
	}
};


export const setupAutoDeletion = async () => {
	await permanentlyDeleteOldItems();

	shim.setInterval(async () => {
		await permanentlyDeleteOldItems();
	}, 18 * Hour);
};

export default permanentlyDeleteOldItems;
