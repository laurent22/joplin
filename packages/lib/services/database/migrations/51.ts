import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN base_body TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE sync_items ADD COLUMN base_title TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE sync_items ADD COLUMN base_conflict_note_id TEXT NOT NULL DEFAULT ""',
		`CREATE TABLE IF NOT EXISTS conflict_note_states (
			note_id TEXT PRIMARY KEY,
			base_body TEXT NOT NULL DEFAULT "",
			base_title TEXT NOT NULL DEFAULT "",
			remote_body TEXT NOT NULL DEFAULT "",
			remote_title TEXT NOT NULL DEFAULT "",
			remote_updated_time INT NOT NULL DEFAULT 0
		)`,
	];
};
