import BaseModel from '../BaseModel';
import { ConflictNoteStateEntity } from '../services/database/types';

// Stores the base and remote versions of a note at the moment a conflict was
// created. Keyed by the conflict note's id, this is what a future three-way
// merge needs: the common ancestor (base) and the server version (remote).
export default class ConflictNoteState extends BaseModel {
	public static tableName() {
		return 'conflict_note_states';
	}

	public static modelType() {
		return BaseModel.TYPE_NOTE;
	}

	public static async byNoteId(noteId: string): Promise<ConflictNoteStateEntity> {
		return this.db().selectOne('SELECT * FROM conflict_note_states WHERE note_id = ?', [noteId]);
	}

	public static async save(state: ConflictNoteStateEntity) {
		await this.db().exec('DELETE FROM conflict_note_states WHERE note_id = ?', [state.note_id]);
		await this.db().exec(
			'INSERT INTO conflict_note_states (note_id, base_body, base_title, remote_body, remote_title, remote_updated_time) VALUES (?, ?, ?, ?, ?, ?)',
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
