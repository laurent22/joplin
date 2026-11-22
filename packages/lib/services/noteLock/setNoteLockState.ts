import { ModelType } from '../../BaseModel';
import BaseItem from '../../models/BaseItem';
import ItemChange from '../../models/ItemChange';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import { itemIsReadOnlySync, ItemSlice } from '../../models/utils/readOnly';
import { NoteEntity } from '../database/types';
import eventManager, { EventName } from '../../eventManager';
import isNoteLockEnabled from './isNoteLockEnabled';
import NoteLockSession from './NoteLockSession';
import { noteLockKeyConflict } from '../synchronizer/syncInfoUtils';
import JoplinError from '../../JoplinError';
import { ErrorCode } from '../../errors';
import { _ } from '../../locale';

// Shared with the bulk change, which skips these notes instead of failing. Only needs the validationFields.
export const noteLockChangeBlockedReason = (note: NoteEntity) => {
	if (note.deleted_time) return 'Cannot change the note lock of a deleted note';
	if (note.is_conflict) return 'Cannot change the note lock of a conflict note';
	if (itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note as ItemSlice, Setting.value('sync.userId'), BaseItem.syncShareCache)) return 'Cannot change the note lock of a read-only note';
	return '';
};

// The UI hides the enable/disable actions for these cases, but the commands can also be
// invoked directly (keyboard, plugins), so the transitions fail closed here too.
const checkCanChangeLockState = (note: NoteEntity, noteId: string) => {
	if (!isNoteLockEnabled()) throw new Error('Note lock is not enabled');
	if (!note) throw new Error(`No such note: ${noteId}`);
	const blockedReason = noteLockChangeBlockedReason(note);
	if (blockedReason) throw new Error(blockedReason);
	if (!NoteLockSession.instance().isUnlocked()) throw new Error('Cannot change the note lock while the session is locked');
	// The migration re-encrypts the locked notes it finds, so a note locked or unlocked meanwhile could be missed or fail it.
	if (noteLockKeyConflict()) throw new JoplinError(_('Notes cannot be locked or unlocked while a note lock key migration is required.'), ErrorCode.NoteLockKeyConflict);
};

export const validationFields = ['id', 'is_locked', 'deleted_time', 'is_conflict', 'share_id'];

// These only validate and emit: the note screen listens for the event and persists the
// change with a scheduled gated save.
export const enableNoteLock = async (noteId: string) => {
	const note = await Note.load(noteId, { fields: validationFields });
	checkCanChangeLockState(note, noteId);
	if (note.is_locked) throw new Error(`Note is already locked: ${noteId}`);
	eventManager.emit(EventName.NoteLockNoteStateChange, { noteId, isLocked: true });
};

export const disableNoteLock = async (noteId: string) => {
	const note = await Note.load(noteId, { fields: validationFields });
	checkCanChangeLockState(note, noteId);
	if (!note.is_locked) throw new Error(`Note is not locked: ${noteId}`);
	eventManager.emit(EventName.NoteLockNoteStateChange, { noteId, isLocked: false });
};
