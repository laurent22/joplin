import { NoteEntity } from '../database/types';
import { MarkupLanguage } from '@joplin/renderer';
import Note from '../../models/Note';
import BaseItem from '../../models/BaseItem';
import Setting from '../../models/Setting';
import ItemChange from '../../models/ItemChange';
import { ModelType } from '../../BaseModel';
import { itemIsReadOnlySync } from '../../models/utils/readOnly';
import isConflictResolutionEnabled from './isConflictResolutionEnabled';

const isMarkdown = (note: NoteEntity) => {
	return !note.markup_language || note.markup_language === MarkupLanguage.Markdown;
};

const isReadOnlyShare = (note: NoteEntity) => {
	const shareCache = BaseItem.syncShareCache;
	// itemIsReadOnlySync throws without a share state
	if (!shareCache) return false;

	return itemIsReadOnlySync(
		ModelType.Note,
		ItemChange.SOURCE_UNSPECIFIED,
		{ id: note.id, share_id: note.share_id, deleted_time: note.deleted_time },
		Setting.value('sync.userId'),
		shareCache,
		// The trash is checked separately, so only share permission matters
		true,
	);
};

export const conflictNoteIsResolvable = (note: NoteEntity|null|undefined) => {
	if (!isConflictResolutionEnabled()) return false;
	if (!note || !note.is_conflict) return false;
	if (note.encryption_applied || note.is_locked) return false;
	if (!isMarkdown(note)) return false;
	return true;
};

export default async (note: NoteEntity|null|undefined): Promise<{ resolvable: boolean; original: NoteEntity|null }> => {
	if (!conflictNoteIsResolvable(note)) return { resolvable: false, original: null };
	// A folder conflict marks the note without linking an original
	if (!note.conflict_original_id) return { resolvable: false, original: null };

	const original = await Note.load(note.conflict_original_id);
	if (!original) return { resolvable: false, original: null };

	if (original.encryption_applied || original.is_locked) return { resolvable: false, original };
	if (!isMarkdown(original)) return { resolvable: false, original };
	if (original.deleted_time) return { resolvable: false, original };
	if (isReadOnlyShare(original)) return { resolvable: false, original };

	return { resolvable: true, original };
};
