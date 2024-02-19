import sqlStringToLines from '../sqlStringToLines';
import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	const queries = [];

	queries.push('ALTER TABLE notes_normalized ADD COLUMN original_title TEXT NOT NULL DEFAULT ""');

	queries.push('DROP TRIGGER notes_fts_before_update');
	queries.push('DROP TRIGGER notes_fts_before_delete');
	queries.push('DROP TRIGGER notes_after_update');
	queries.push('DROP TRIGGER notes_after_insert');

	queries.push('DROP TABLE notes_fts');

	const tableFields = 'id, title, body, user_created_time, user_updated_time, is_todo, todo_completed, parent_id, latitude, longitude, altitude, source_url, original_title';

	const newVirtualTableSql = `
					CREATE VIRTUAL TABLE notes_fts USING fts4(
						content="notes_normalized",
						notindexed="id",
						notindexed="user_created_time",
						notindexed="user_updated_time",
						notindexed="is_todo",
						notindexed="todo_completed",
						notindexed="parent_id",
						notindexed="latitude",
						notindexed="longitude",
						notindexed="altitude",
						notindexed="source_url",
						notindexed="original_title",
						${tableFields}
					);`
				;

	queries.push(sqlStringToLines(newVirtualTableSql)[0]);

	queries.push(`
					CREATE TRIGGER notes_fts_before_update BEFORE UPDATE ON notes_normalized BEGIN
						DELETE FROM notes_fts WHERE docid=old.rowid;
					END;`);
	queries.push(`
					CREATE TRIGGER notes_fts_before_delete BEFORE DELETE ON notes_normalized BEGIN
						DELETE FROM notes_fts WHERE docid=old.rowid;
					END;`);
	queries.push(`
					CREATE TRIGGER notes_after_update AFTER UPDATE ON notes_normalized BEGIN
						INSERT INTO notes_fts(docid, ${tableFields}) SELECT rowid, ${tableFields} FROM notes_normalized WHERE new.rowid = notes_normalized.rowid;
					END;`);
	queries.push(`
					CREATE TRIGGER notes_after_insert AFTER INSERT ON notes_normalized BEGIN
						INSERT INTO notes_fts(docid, ${tableFields}) SELECT rowid, ${tableFields} FROM notes_normalized WHERE new.rowid = notes_normalized.rowid;
					END;`);

	// --------

	queries.push('ALTER TABLE items_normalized ADD COLUMN original_title TEXT NOT NULL DEFAULT ""');

	queries.push('DROP TRIGGER items_fts_before_update');
	queries.push('DROP TRIGGER items_fts_before_delete');
	queries.push('DROP TRIGGER items_after_update');
	queries.push('DROP TRIGGER items_after_insert');
	queries.push('DROP TABLE items_fts');

	const tableFields2 = 'id, title, body, item_id, item_type, user_updated_time, reserved1, reserved2, reserved3, reserved4, reserved5, reserved6, original_title';

	const newVirtualTableSql2 = `
		CREATE VIRTUAL TABLE items_fts USING fts4(
			content="items_normalized",
			notindexed="id",
			notindexed="item_id",
			notindexed="item_type",
			notindexed="user_updated_time",
			notindexed="reserved1",
			notindexed="reserved2",
			notindexed="reserved3",
			notindexed="reserved4",
			notindexed="reserved5",
			notindexed="reserved6",
			notindexed="original_title",
			${tableFields2}
		);`
	;

	queries.push(sqlStringToLines(newVirtualTableSql2)[0]);

	queries.push(`
		CREATE TRIGGER items_fts_before_update BEFORE UPDATE ON items_normalized BEGIN
			DELETE FROM items_fts WHERE docid=old.rowid;
		END;`);
	queries.push(`
		CREATE TRIGGER items_fts_before_delete BEFORE DELETE ON items_normalized BEGIN
			DELETE FROM items_fts WHERE docid=old.rowid;
		END;`);
	queries.push(`
		CREATE TRIGGER items_after_update AFTER UPDATE ON items_normalized BEGIN
			INSERT INTO items_fts(docid, ${tableFields2}) SELECT rowid, ${tableFields2} FROM items_normalized WHERE new.rowid = items_normalized.rowid;
		END;`);
	queries.push(`
		CREATE TRIGGER items_after_insert AFTER INSERT ON items_normalized BEGIN
			INSERT INTO items_fts(docid, ${tableFields2}) SELECT rowid, ${tableFields2} FROM items_normalized WHERE new.rowid = items_normalized.rowid;
		END;`);

	return queries;
};
