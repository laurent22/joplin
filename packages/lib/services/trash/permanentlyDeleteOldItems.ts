import Logger from '@joplin/utils/Logger';
import Folder from '../../models/Folder';
import Setting from '../../models/Setting';
import Note from '../../models/Note';
import { Day, Hour } from '@joplin/utils/time';
import shim from '../../shim';
import { itemIsReadOnlySync } from '../../models/utils/readOnly';
import BaseItem from '../../models/BaseItem';
import { ModelType } from '../../BaseModel';
import ItemChange from '../../models/ItemChange';

const logger = Logger.create('permanentlyDeleteOldData');

const readOnlyItemsRemoved = async (itemIds: string[], itemType: ModelType) => {
	const result = [];
	for (const id of itemIds) {
		const item = await BaseItem.loadItem(itemType, id);

		// Only do the share-related read-only checks. If other checks are done,
		// readOnly will always be true because the item is in the trash.
		const shareChecksOnly = true;
		const readOnly = itemIsReadOnlySync(
			itemType,
			ItemChange.SOURCE_UNSPECIFIED,
			item,
			Setting.value('sync.userId'),
			BaseItem.syncShareCache,
			shareChecksOnly,
		);
		if (!readOnly) {
			result.push(id);
		}
	}
	return result;
};

const itemsToDelete = async (ttl: number|null = null) => {
	const result = await Folder.trashItemsOlderThan(ttl);
	const folderIds = await readOnlyItemsRemoved(result.folderIds, ModelType.Folder);
	const noteIds = await readOnlyItemsRemoved(result.noteIds, ModelType.Note);

	return { folderIds, noteIds };
};

const permanentlyDeleteOldItems = async (ttl: number = null) => {
	ttl = ttl === null ? Setting.value('trash.ttlDays') * Day : ttl;

	logger.info(`Processing items older than ${ttl}ms...`);

	if (!Setting.value('trash.autoDeletionEnabled')) {
		logger.info('Auto-deletion is not enabled - skipping');
		return;
	}

	const toDelete = await itemsToDelete(ttl);
	logger.info('Items to permanently delete:', toDelete);

	await Note.batchDelete(toDelete.noteIds, { sourceDescription: 'permanentlyDeleteOldItems' });

	// We only auto-delete folders if they are empty.
	for (const folderId of toDelete.folderIds) {
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
