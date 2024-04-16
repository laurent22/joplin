import { Dispatch } from 'redux';
import Logger from '@joplin/utils/Logger';
import BaseItem from '../../../models/BaseItem';
import ItemChange from '../../../models/ItemChange';
import Note from '../../../models/Note';
import Resource from '../../../models/Resource';
import time from '../../../time';
import { SyncAction, conflictActions } from './types';

const logger = Logger.create('handleConflictAction');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default async (action: SyncAction, ItemClass: typeof BaseItem, remoteExists: boolean, remoteContent: any, local: any, syncTargetId: number, itemIsReadOnly: boolean, dispatch: Dispatch) => {
	if (!conflictActions.includes(action)) return;

	logger.debug(`Handling conflict: ${action}`);
	logger.debug('local:', local, 'remoteContent', remoteContent);
	logger.debug('remoteExists:', remoteExists);

	if (action === SyncAction.ItemConflict) {
		// ------------------------------------------------------------------------------
		// For non-note conflicts, we take the remote version (i.e. the version that was
		// synced first) and overwrite the local content.
		// ------------------------------------------------------------------------------

		if (remoteExists) {
			local = remoteContent;

			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
			await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });
		} else {
			await ItemClass.delete(local.id, {
				changeSource: ItemChange.SOURCE_SYNC,
				sourceDescription: 'sync: handleConflictAction: non-note conflict',
				trackDeleted: false,
			});
		}
	} else if (action === SyncAction.NoteConflict) {
		// ------------------------------------------------------------------------------
		// First find out if the conflict matters. For example, if the conflict is on the title or body
		// we want to preserve all the changes. If it's on todo_completed it doesn't really matter
		// so in this case we just take the remote content.
		// ------------------------------------------------------------------------------

		let mustHandleConflict = true;
		if (!itemIsReadOnly && remoteContent) {
			mustHandleConflict = Note.mustHandleConflict(local, remoteContent);
		}

		// ------------------------------------------------------------------------------
		// Create a duplicate of local note into Conflicts folder
		// (to preserve the user's changes)
		// ------------------------------------------------------------------------------

		if (mustHandleConflict) {
			await Note.createConflictNote(local, ItemChange.SOURCE_SYNC);
		}
	} else if (action === SyncAction.ResourceConflict) {
		if (!remoteContent || Resource.mustHandleConflict(local, remoteContent)) {
			await Resource.createConflictResourceNote(local);

			if (remoteExists) {
				// The local content we have is no longer valid and should be re-downloaded
				await Resource.setLocalState(local.id, {
					fetch_status: Resource.FETCH_STATUS_IDLE,
				});
			}

			dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: local.id });
		}
	}

	if ([SyncAction.NoteConflict, SyncAction.ResourceConflict].includes(action)) {
		// ------------------------------------------------------------------------------
		// For note and resource conflicts, the creation of the conflict item is done
		// differently. However the way the local content is handled is the same.
		// Either copy the remote content to local or, if the remote content has
		// been deleted, delete the local content.
		// ------------------------------------------------------------------------------

		if (remoteExists) {
			local = remoteContent;
			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, time.unixMs());
			await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });

			if (local.encryption_applied) dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
		} else {
			// Remote no longer exists (note deleted) so delete local one too
			await ItemClass.delete(
				local.id,
				{
					changeSource: ItemChange.SOURCE_SYNC,
					trackDeleted: false,
					sourceDescription: 'sync: handleConflictAction: note/resource conflict',
				},
			);
		}
	}
};
