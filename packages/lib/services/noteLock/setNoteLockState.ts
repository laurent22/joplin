import { ModelType } from '../../BaseModel';
import BaseItem from '../../models/BaseItem';
import ItemChange from '../../models/ItemChange';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import { itemIsReadOnlySync, ItemSlice } from '../../models/utils/readOnly';
import { NoteEntity } from '../database/types';
import eventManager, { EventName } from '../../eventManager';
import isNoteLockEnabled from './isNoteLockEnabled';

// The UI hides the enable/disable actions for these cases, but the commands can also be
// invoked directly (keyboard, plugins), so the transitions fail closed here too.
const checkCanChangeLockState = (note: NoteEntity, noteId: string) => {
	if (!isNoteLockEnabled()) throw new Error('Note lock is not enabled');
	if (!note) throw new Error(`No such note: ${noteId}`);
	if (note.deleted_time) throw new Error('Cannot change encryption of a deleted note');
	if (note.is_conflict) throw new Error('Cannot change encryption of a conflict note');
	if (itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note as ItemSlice, Setting.value('sync.userId'), BaseItem.syncShareCache)) throw new Error('Cannot change encryption of a read-only note');
};

export const enableNoteLock = async (noteId: string) => {
	const note = await Note.load(noteId);
	checkCanChangeLockState(note, noteId);
	if (note.is_locked) throw new Error(`Note is already locked: ${noteId}`);
	// The body is plaintext because the note was not locked, so mark it decrypted for the gated save.
	const toSave = { ...note, is_locked: 1, isDecrypted: true };
	await Note.save(toSave, { useNoteLock: true });
	eventManager.emit(EventName.NoteLockNoteStateChange, { noteId, isLocked: true });
};

export const disableNoteLock = async (noteId: string) => {
	const note = await Note.load(noteId, { useNoteLock: true });
	checkCanChangeLockState(note, noteId);
	if (!note.is_locked) throw new Error(`Note is not locked: ${noteId}`);
	await Note.save({ ...note, is_locked: 0 }, { useNoteLock: true });
	eventManager.emit(EventName.NoteLockNoteStateChange, { noteId, isLocked: false });
};
