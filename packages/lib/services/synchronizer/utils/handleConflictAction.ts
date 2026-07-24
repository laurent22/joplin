import { Dispatch } from 'redux';
import Logger from '@joplin/utils/Logger';
import BaseItem from '../../../models/BaseItem';
import ItemChange from '../../../models/ItemChange';
import Note from '../../../models/Note';
import Resource from '../../../models/Resource';
import { BaseItemEntity, NoteEntity } from '../../database/types';
import { SyncAction, conflictActions } from './types';
import ConflictNoteState from '../../../models/ConflictNoteState';
import autoMergeNote from '../../conflict/autoMergeNote';
import time from '../../../time';

const logger = Logger.create('handleConflictAction');

export default async (action: SyncAction, ItemClass: typeof BaseItem, remoteExists: boolean, remoteContent: BaseItemEntity, local: BaseItemEntity, syncTargetId: number, itemIsReadOnly: boolean, dispatch: Dispatch) => {
	if (!conflictActions.includes(action)) return;

	// Linked to the original note only after the remote-overwrite step below, which
	// rebuilds the sync_items row and would otherwise wipe the link.
	let createdConflictNoteId = '';

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

			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, BaseItem.remoteItemSyncTime(remoteContent.updated_time), remoteContent.updated_time);
			await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });
		} else {
			// If the item is a folder, avoid deleting child notes and folders, as this could cause massive data loss where this conflict happens unexpectedly
			await ItemClass.delete(local.id, {
				changeSource: ItemChange.SOURCE_SYNC,
				sourceDescription: 'sync: handleConflictAction: non-note conflict',
				trackDeleted: false,
				deleteChildren: false,
			});
		}
	} else if (action === SyncAction.NoteConflict) {
		// Reload the note, to ensure the latest version is used to create the conflict
		local = await Note.load(local.id);

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
		// Try a three-way merge using the saved base version before deciding how to
		// handle the conflict. Non-overlapping changes from both sides are merged
		// automatically, and only real conflicts are left for the user.
		//
		// Skip this when the content cannot be merged safely:
		// - Read-only items: the local change cannot be pushed to the sync target, so
		//   it must be preserved as a conflict note rather than merged into the note.
		// - Encrypted notes: the note body is still encrypted.
		// - Locked notes : these do not use the new conflict
		//   resolution flow and continue with the existing manual conflict process.
		// ------------------------------------------------------------------------------

		let merge: ReturnType<typeof autoMergeNote>|null = null;
		if (mustHandleConflict && remoteContent && !itemIsReadOnly) {
			const localNote = local as NoteEntity;
			const remoteNote = remoteContent as NoteEntity;
			const cannotAutoMerge = (note: NoteEntity) => !!note.encryption_applied || !!note.encryption_cipher_text || !!note.is_locked;

			if (!cannotAutoMerge(localNote) && !cannotAutoMerge(remoteNote)) {
				const base = await Note.syncBaseContent(syncTargetId, local.id);
				merge = autoMergeNote(
					{ title: base ? base.base_title : '', body: base ? base.base_body : '' },
					{ title: localNote.title, body: localNote.body },
					{ title: remoteNote.title, body: remoteNote.body },
				);
			}
		}

		// ------------------------------------------------------------------------------
		// If all changes were merged successfully, there is no need to create a
		// conflict note. Save the merged note and skip conflict-note creation.
		// ------------------------------------------------------------------------------

		if (merge && merge.fullyMerged) {
			const remoteNote = remoteContent as NoteEntity;
			const mergedNote: NoteEntity = {
				...remoteNote,
				title: merge.resolvedLocal.title,
				body: merge.resolvedLocal.body,
				// Keep the timestamp newer than the remote version so the merged note is
				// treated as a local change and uploaded, even if the remote clock is ahead.
				updated_time: Math.max(time.unixMs(), remoteNote.updated_time + 1),
			};
			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, mergedNote, BaseItem.remoteItemSyncTime(remoteNote.updated_time), remoteNote.updated_time);
			await ItemClass.save(mergedNote, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });

			logger.info(`Auto-merged conflict for note ${local.id} - no conflict note created`);
			return;
		}

		// ------------------------------------------------------------------------------
		// Create a duplicate of local note into Conflicts folder
		// (to preserve the user's changes)
		// ------------------------------------------------------------------------------

		if (mustHandleConflict) {
			// Non-conflicting changes from both sides are merged before creating the
			// conflict note, so it only differs from the resolved note in the parts that
			// still have real conflicts. The remote version is merged the same way below,
			// so the updated original matches as well.
			if (merge) {
				local = { ...local, title: merge.resolvedLocal.title, body: merge.resolvedLocal.body } as NoteEntity;
				remoteContent = { ...remoteContent, title: merge.resolvedCurrent.title, body: merge.resolvedCurrent.body } as NoteEntity;
			}

			const conflictNote = await Note.createConflictNote(local, ItemChange.SOURCE_SYNC);
			createdConflictNoteId = conflictNote.id;

			// Record base (read now, before the rebuild below) and remote. The local
			// version is already preserved as the conflict note itself.
			const base = await Note.syncBaseContent(syncTargetId, local.id);
			const remoteNote = remoteContent as NoteEntity;
			await ConflictNoteState.save({
				note_id: conflictNote.id,
				base_body: base ? base.base_body : '',
				base_title: base ? base.base_title : '',
				remote_body: remoteNote ? remoteNote.body : '',
				remote_title: remoteNote ? remoteNote.title : '',
				remote_updated_time: remoteNote ? remoteNote.updated_time : 0,
			});
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
			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, BaseItem.remoteItemSyncTime(remoteContent.updated_time), remoteContent.updated_time);
			await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });

			// Link after the save above, which rebuilds the sync_items row.
			if (createdConflictNoteId) {
				await Note.setBaseConflictNoteId(syncTargetId, local.id, createdConflictNoteId);
			}

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
