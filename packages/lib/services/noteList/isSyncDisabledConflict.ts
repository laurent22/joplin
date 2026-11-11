import { NoteEntity } from '../database/types';

const isSyncDisabledConflict = (note: NoteEntity) => {
	return !!note.is_conflict && (!note.conflict_original_id || !!note.share_id);
};

export default isSyncDisabledConflict;
