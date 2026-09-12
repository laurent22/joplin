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
import decryptNoteInMemory from '../../conflict/decryptNoteInMemory';
import isAutoMergeEnabled from '../../conflict/isAutoMergeEnabled';
import time from '../../../time';

const logger = Logger.create('handleConflictAction');

export default async (action: SyncAction, ItemClass: typeof BaseItem, remoteExists: boolean, remoteContent: BaseItemEntity, local: BaseItemEntity, syncTargetId: number, itemIsReadOnly: boolean, dispatch: Dispatch) => {
	if (!conflictActions.includes(action)) return;

	// Linked to the original note only after the remote-overwrite step below, which
	// rebuilds the sync_items row and would otherwise wipe the link.
	let createdConflictNoteId = '';

	// Keep the server's own timestamp, before a partial merge moves it ahead
	const remoteSyncedTime = remoteContent ? remoteContent.updated_time : 0;

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

			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, BaseItem.remoteItemSyncTime(remoteContent.updated_time), null, remoteContent.updated_time);
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

		// The remote note is only decrypted after it's saved, so decrypt it in memory here
		const decryptedRemoteNote = mustHandleConflict && remoteContent ? await decryptNoteInMemory(remoteContent as NoteEntity) : null;

		// Skipped for content that can't be merged safely: read-only items (the local change
		// can't be pushed), still encrypted local notes and the locked notes
		let merge: ReturnType<typeof autoMergeNote>|null = null;
		if (mustHandleConflict && decryptedRemoteNote && !itemIsReadOnly && isAutoMergeEnabled()) {
			const localNote = local as NoteEntity;
			const cannotAutoMerge = (note: NoteEntity) => !!note.encryption_applied || !!note.encryption_cipher_text || !!note.is_locked;

			if (!cannotAutoMerge(localNote) && !cannotAutoMerge(decryptedRemoteNote)) {
				const base = await Note.syncBaseContent(syncTargetId, local.id);

				// No common ancestor, so use the normal conflict flow
				if (base && (base.base_body || base.base_title)) {
					merge = autoMergeNote(
						{ title: base.base_title, body: base.base_body },
						{ title: localNote.title, body: localNote.body },
						{ title: decryptedRemoteNote.title, body: decryptedRemoteNote.body },
					);
				}
			}
		}

		// Everything merged cleanly: save the result and no conflict note creation is needed
		if (merge && merge.fullyMerged) {
			// Only the title and body are replaced, so fields such as user_updated_time stay
			// consistent with the normal conflict path. The decrypted copy drops the cipher text
			const remoteNote = decryptedRemoteNote;
			const mergedNote: NoteEntity = {
				...remoteNote,
				title: merge.resolvedLocal.title,
				body: merge.resolvedLocal.body,
				// Ahead of the remote time so the merge uploads as a local change
				updated_time: Math.max(time.unixMs(), remoteNote.updated_time + 1),
			};
			// Both sides now share the merged output, so it becomes the base for later conflicts
			const mergedBase = {
				base_body: mergedNote.body ?? '',
				base_title: mergedNote.title ?? '',
				base_conflict_note_id: '',
			};
			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, mergedNote, BaseItem.remoteItemSyncTime(remoteNote.updated_time), mergedBase, remoteNote.updated_time);
			await ItemClass.save(mergedNote, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });

			// No conflict note is created, so the mobile viewer/editor must reload the merged note
			dispatch({
				type: 'EDITOR_NOTE_NEEDS_RELOAD',
				noteId: local.id,
			});

			logger.info(`Auto-merged conflict for note ${local.id} - no conflict note created`);
			return;
		}

		// ------------------------------------------------------------------------------
		// Create a duplicate of local note into Conflicts folder
		// (to preserve the user's changes)
		// ------------------------------------------------------------------------------

		if (mustHandleConflict) {
			// An encrypted remote has no readable title or body. The cipher text goes with it,
			// or the decryption worker would later overwrite the merge with the original.
			if (decryptedRemoteNote && (remoteContent as NoteEntity).encryption_cipher_text) {
				remoteContent = { ...remoteContent, ...decryptedRemoteNote } as NoteEntity;
			}

			// Merge the non-conflicting changes into both sides before creating the
			// conflict note, so they only differ where a real conflict remain
			if (merge) {
				const remoteNote = remoteContent as NoteEntity;
				// Nothing was merged into the remote side, so it don't need uploading again
				const remoteUnchanged = merge.resolvedCurrent.title === remoteNote.title && merge.resolvedCurrent.body === remoteNote.body;

				local = { ...local, title: merge.resolvedLocal.title, body: merge.resolvedLocal.body } as NoteEntity;
				remoteContent = {
					...remoteNote,
					title: merge.resolvedCurrent.title,
					body: merge.resolvedCurrent.body,
					// Ahead of the remote time so the merged changes upload as a local change
					updated_time: remoteUnchanged ? remoteNote.updated_time : Math.max(time.unixMs(), remoteNote.updated_time + 1),
				} as NoteEntity;
			}

			const conflictNote = await Note.createConflictNote(local, ItemChange.SOURCE_SYNC);
			createdConflictNoteId = conflictNote.id;

			// Read the base before the rebuild below. The remote version is the original
			// note, so only its updated_time is kept, to detect it changing later.
			const base = await Note.syncBaseContent(syncTargetId, local.id);
			const remoteNote = remoteContent as NoteEntity;
			await ConflictNoteState.save({
				note_id: conflictNote.id,
				base_body: base ? base.base_body : '',
				base_title: base ? base.base_title : '',
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

			// The remote version becomes the base, as a conflict note may be deleted rather than
			// resolved. An encrypted note carries no title or body, so the base is left empty
			// and the decryption worker records it once decrypted.
			const conflictBase = action === SyncAction.NoteConflict ? {
				base_body: (local as NoteEntity).body ?? '',
				base_title: (local as NoteEntity).title ?? '',
				base_conflict_note_id: '',
			} : null;

			const syncTimeQueries = BaseItem.updateSyncTimeQueries(syncTargetId, local, BaseItem.remoteItemSyncTime(remoteSyncedTime), conflictBase, remoteSyncedTime);
			await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries: syncTimeQueries });

			if (action === SyncAction.NoteConflict) {
				// Force the viewer / editor to reload on mobile, if the conflicting note is currently open
				dispatch({
					type: 'EDITOR_NOTE_NEEDS_RELOAD',
					noteId: local.id,
				});
			}

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
