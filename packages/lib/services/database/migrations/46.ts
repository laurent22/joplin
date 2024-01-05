import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE `notes` ADD COLUMN `deleted_time` INT NOT NULL DEFAULT 0',
		'ALTER TABLE `folders` ADD COLUMN `deleted_time` INT NOT NULL DEFAULT 0',
		'DROP VIEW tags_with_note_count',
		`
			CREATE VIEW tags_with_note_count AS 
			SELECT
				tags.id as id,
				tags.title as title,
				tags.created_time as created_time,
				tags.updated_time as updated_time,
				COUNT(notes.id) as note_count, 
				SUM(CASE WHEN notes.todo_completed > 0 THEN 1 ELSE 0 END) AS todo_completed_count
			FROM tags 
				LEFT JOIN note_tags nt on nt.tag_id = tags.id 
				LEFT JOIN notes on notes.id = nt.note_id 
			WHERE
				notes.id IS NOT NULL
				AND notes.deleted_time = 0
			GROUP BY tags.id
		`,
	];
};
