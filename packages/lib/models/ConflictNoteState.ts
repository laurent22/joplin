import BaseModel from '../BaseModel';
import { ConflictNoteStateEntity } from '../services/database/types';

// Keyed by the conflict note id. The remote note only stores it's updated_time
// to track later changes. remote_title and remote_body are kept for future
// partial conflict resolution.

// Rows here are written but not cleaned up when a conflict note is deleted - the
// merge UI that consumes them will skip a missing conflict note, and cleanup can
// be a follow-up.
export default class ConflictNoteState extends BaseModel {
	public static tableName() {
		return 'conflict_note_states';
	}

	public static modelType() {
		return BaseModel.TYPE_CONFLICT_NOTE_STATE;
	}

	public static async byNoteId(noteId: string): Promise<ConflictNoteStateEntity> {
		return this.db().selectOne('SELECT * FROM conflict_note_states WHERE note_id = ?', [noteId]);
	}

	public static async save(state: ConflictNoteStateEntity) {
		await this.db().exec(
			'INSERT OR REPLACE INTO conflict_note_states (note_id, base_body, base_title, remote_body, remote_title, remote_updated_time) VALUES (?, ?, ?, ?, ?, ?)',
			[
				state.note_id,
				state.base_body ?? '',
				state.base_title ?? '',
				state.remote_body ?? '',
				state.remote_title ?? '',
				state.remote_updated_time ?? 0,
			],
		);
	}
}
