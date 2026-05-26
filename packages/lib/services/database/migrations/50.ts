import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN base_body TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE sync_items ADD COLUMN base_title TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE sync_items ADD COLUMN base_conflict_note_id TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE notes ADD COLUMN conflict_base_body TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE notes ADD COLUMN conflict_base_title TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE notes ADD COLUMN conflict_remote_body TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE notes ADD COLUMN conflict_remote_title TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE notes ADD COLUMN conflict_remote_updated_time INT NOT NULL DEFAULT 0',
	];
};
