import { SqlQuery } from '../types';

// Recreate conflict_note_states with a numeric auto-increment primary key, to
// match the convention used by the other tables. note_id keeps its uniqueness
// through a UNIQUE constraint. The table was added in migration 51 and hasn't
// shipped in a release yet, so it is safe to drop and recreate it rather than
// migrate the rows

export default (): (SqlQuery|string)[] => {
	return [
		'DROP TABLE IF EXISTS conflict_note_states',
		`CREATE TABLE conflict_note_states (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			note_id TEXT NOT NULL UNIQUE,
			base_body TEXT NOT NULL DEFAULT "",
			base_title TEXT NOT NULL DEFAULT "",
			remote_body TEXT NOT NULL DEFAULT "",
			remote_title TEXT NOT NULL DEFAULT "",
			remote_updated_time INT NOT NULL DEFAULT 0
		)`,
	];
};
