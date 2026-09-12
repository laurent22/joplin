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

// The UI hides the enable/disable actions for these cases, but the commands can also be
// invoked directly (keyboard, plugins), so the transitions fail closed here too.
const checkCanChangeLockState = (note: NoteEntity, noteId: string) => {
	if (!isNoteLockEnabled()) throw new Error('Note lock is not enabled');
	if (!note) throw new Error(`No such note: ${noteId}`);
	if (note.deleted_time) throw new Error('Cannot change the note lock of a deleted note');
	if (note.is_conflict) throw new Error('Cannot change the note lock of a conflict note');
	if (itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note as ItemSlice, Setting.value('sync.userId'), BaseItem.syncShareCache)) throw new Error('Cannot change the note lock of a read-only note');
	if (!NoteLockSession.instance().isUnlocked()) throw new Error('Cannot change the note lock while the session is locked');
};

const validationFields = ['id', 'is_locked', 'deleted_time', 'is_conflict', 'share_id'];

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
