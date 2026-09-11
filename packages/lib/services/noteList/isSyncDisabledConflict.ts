import { NoteEntity } from '../database/types';

const isSyncDisabledConflict = (note: NoteEntity) => {
	return !!note.is_conflict && (!note.conflict_original_id || !!note.is_shared);
};

export default isSyncDisabledConflict;
