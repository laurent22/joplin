import { ModelType } from '../../BaseModel';
import BaseItem from '../../models/BaseItem';
import { NoteEntity } from '../database/types';
import NoteLockSession from './NoteLockSession';
import isNoteLockEnabled from './isNoteLockEnabled';

const hasLockedNoteWhileSessionLocked = async (noteIds: string[]) => {
	if (!isNoteLockEnabled() || NoteLockSession.instance().isUnlocked()) return false;
	const notes: NoteEntity[] = await BaseItem.loadItemsByTypeAndIds(ModelType.Note, noteIds, { fields: ['is_locked'] });
	return notes.some(note => !!note.is_locked);
};

export default hasLockedNoteWhileSessionLocked;
