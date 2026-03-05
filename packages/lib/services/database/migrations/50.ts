import { SqlQuery } from '../types';

// Fixes: https://github.com/laurent22/joplin/issues/14540
//
// When syncing across multiple devices, a race condition in the DELTA sync step
// could cause duplicate tags with identical titles to be created. This happened
// because NoteTag items could be downloaded before their associated Tag item,
// triggering Tag.save({ title }) without an id — creating a new duplicate tag
// which then propagated to all synced devices.
//
// This migration applies two fixes:
//
// 1. Merges any existing duplicate tags (same title, case-insensitive) by
//    reassigning all note_tags rows to the oldest tag (lowest created_time),
//    then deleting the duplicate tag rows.
//
// 2. Adds a UNIQUE index on tags.title (COLLATE NOCASE) to prevent future
//    duplicates at the database level.
//
// Note: the existing non-unique index `tags_title` is kept as-is. SQLite
// allows both a non-unique and a unique index on the same column.

export default (): (SqlQuery | string)[] => {
	return [
		// Step 1: For every note_tag that points to a duplicate tag,
		// redirect it to the canonical tag (the one with the lowest created_time,
		// breaking ties by id ASC to be deterministic).
		`
		UPDATE note_tags
		SET tag_id = (
			SELECT id FROM tags t_canonical
			WHERE LOWER(t_canonical.title) = LOWER(
				(SELECT title FROM tags WHERE id = note_tags.tag_id)
			)
			ORDER BY t_canonical.created_time ASC, t_canonical.id ASC
			LIMIT 1
		)
		WHERE tag_id IN (
			SELECT id FROM tags
			WHERE LOWER(title) IN (
				SELECT LOWER(title) FROM tags
				GROUP BY LOWER(title)
				HAVING COUNT(*) > 1
			)
		)
		`,

		// Step 2: Delete duplicate tags, keeping only the canonical one
		// (lowest created_time, then id ASC as tiebreaker).
		`
		DELETE FROM tags
		WHERE id IN (
			SELECT id FROM tags t_dup
			WHERE EXISTS (
				SELECT 1 FROM tags t_canonical
				WHERE LOWER(t_canonical.title) = LOWER(t_dup.title)
				AND (
					t_canonical.created_time < t_dup.created_time
					OR (t_canonical.created_time = t_dup.created_time AND t_canonical.id < t_dup.id)
				)
			)
		)
		`,

		// Step 3: Add a UNIQUE index on tags.title (case-insensitive).
		// This prevents any future duplicate tags at the database level.
		// The existing non-unique index tags_title is left intact.
		'CREATE UNIQUE INDEX IF NOT EXISTS tags_title_unique ON tags (title COLLATE NOCASE)',
	];
};
