import { ModelType } from '../../BaseModel';
import { State as ShareState, ShareType } from '../../services/share/reducer';
import ItemChange from '../ItemChange';
import { _ } from '../../locale';
import { FolderEntity, NoteEntity } from '../../services/database/types';

type FolderClass = typeof import('../Folder').default;
type BaseItemClass = typeof import('../BaseItem').default;

export const noteHasActiveNoteShare = (shareState: ShareState, noteId: string) => {
	return (shareState?.shares ?? []).some(share => share.type === ShareType.Note && share.note_id === noteId);
};

export const folderIsInActiveShare = async (Folder: FolderClass, shareState: ShareState, folderId: string) => {
	const ancestors = await Folder.selfAndAncestors(folderId);
	if (ancestors.some(folder => folder.share_id || folder.is_shared)) return true;

	const ancestorIds = ancestors.map(folder => folder.id);
	return (shareState?.shares ?? []).some(share => [ShareType.Folder, ShareType.PublishedFolder].includes(share.type) && !!share.folder_id && ancestorIds.includes(share.folder_id));
};

// Model-boundary checks for the two share/lock invariants: a note cannot become locked while
// shared or published, and locked content cannot enter a share. Sync-sourced saves are exempt.
export const checkNoteLockShareInvariants = async (BaseItem: BaseItemClass, Folder: FolderClass, itemType: ModelType, changeSource: number, shareState: ShareState, o: NoteEntity | FolderEntity, isNew: boolean) => {
	if (changeSource === ItemChange.SOURCE_SYNC) return;

	if (itemType === ModelType.Note) {
		const note = o as NoteEntity;
		const mightLock = !!note.is_locked;
		const mightMove = 'parent_id' in note && !isNew;
		if (!mightLock && ('is_locked' in note || !mightMove)) return;

		const previous: NoteEntity = isNew ? null : await BaseItem.loadItemByTypeAndId(itemType, note.id, { fields: ['id', 'parent_id', 'is_locked', 'is_conflict', 'is_shared', 'share_id'] });
		if (!isNew && !previous) return;

		const wasLocked = !!previous?.is_locked;
		const isLocked = 'is_locked' in note ? !!note.is_locked : wasLocked;
		const isConflict = 'is_conflict' in note ? !!note.is_conflict : !!previous?.is_conflict;
		if (!isLocked || isConflict) return;

		const locking = mightLock && !wasLocked;
		const parentChanged = mightMove && note.parent_id !== previous.parent_id;
		// Clearing is_conflict lets the note sync again, so it counts as entering its parent.
		const conflictCleared = 'is_conflict' in note && !note.is_conflict && !!previous?.is_conflict;
		if (!locking && !parentChanged && !conflictCleared) return;

		if (locking) {
			const isShared = 'is_shared' in note ? note.is_shared : previous?.is_shared;
			const shareId = 'share_id' in note ? note.share_id : previous?.share_id;
			if (shareId || isShared || noteHasActiveNoteShare(shareState, note.id)) {
				throw new Error(_('This note cannot be locked because it is shared or published'));
			}
		}

		const parentId = 'parent_id' in note ? note.parent_id : previous?.parent_id;
		if (parentId && await folderIsInActiveShare(Folder, shareState, parentId)) {
			if (locking) throw new Error(_('This note cannot be locked because it is shared or published'));
			throw new Error(_('This note cannot be moved to a shared or published notebook because it is locked'));
		}
	} else if (itemType === ModelType.Folder) {
		const folder = o as FolderEntity;
		if (isNew || !('parent_id' in folder)) return;

		const previous: FolderEntity = await BaseItem.loadItemByTypeAndId(itemType, folder.id, { fields: ['id', 'parent_id'] });
		if (!previous || folder.parent_id === previous.parent_id || !folder.parent_id) return;

		if (await folderIsInActiveShare(Folder, shareState, folder.parent_id) && await Folder.hasLockedNotes(folder.id)) {
			throw new Error(_('This notebook cannot be moved to a shared or published notebook because it contains locked notes'));
		}
	}
};
