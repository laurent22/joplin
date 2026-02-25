import sqlStringToLines from '../sqlStringToLines';
import { SqlQuery } from '../types';

// Migrates FTS4 virtual tables to FTS5. Newer versions of @sqlite.org/sqlite-wasm
// (>= 3.50.4-build1) no longer include FTS3/FTS4 and only include FTS5.
// See: https://sqlite.org/forum/forumpost/a2e090e3a0
export default (): (SqlQuery | string)[] => {
	const queries: (SqlQuery | string)[] = [];

	// Drop existing FTS4 triggers for notes
	queries.push('DROP TRIGGER IF EXISTS notes_fts_before_update');
	queries.push('DROP TRIGGER IF EXISTS notes_fts_before_delete');
	queries.push('DROP TRIGGER IF EXISTS notes_after_update');
	queries.push('DROP TRIGGER IF EXISTS notes_after_insert');

	// Drop existing FTS4 triggers for items
	queries.push('DROP TRIGGER IF EXISTS items_fts_before_update');
	queries.push('DROP TRIGGER IF EXISTS items_fts_before_delete');
	queries.push('DROP TRIGGER IF EXISTS items_after_update');
	queries.push('DROP TRIGGER IF EXISTS items_after_insert');

	// Drop existing FTS4 virtual tables
	queries.push('DROP TABLE IF EXISTS search_aux');
	queries.push('DROP TABLE IF EXISTS notes_fts');
	queries.push('DROP TABLE IF EXISTS items_fts');

	// Drop FTS4 shadow tables explicitly. When the FTS4 module is not available
	// (e.g. newer @sqlite.org/sqlite-wasm), DROP TABLE on the virtual table
	// may not clean up shadow tables, which would conflict with FTS5 shadow
	// table names.
	queries.push('DROP TABLE IF EXISTS notes_fts_content');
	queries.push('DROP TABLE IF EXISTS notes_fts_segments');
	queries.push('DROP TABLE IF EXISTS notes_fts_segdir');
	queries.push('DROP TABLE IF EXISTS notes_fts_stat');
	queries.push('DROP TABLE IF EXISTS notes_fts_docsize');

	queries.push('DROP TABLE IF EXISTS items_fts_content');
	queries.push('DROP TABLE IF EXISTS items_fts_segments');
	queries.push('DROP TABLE IF EXISTS items_fts_segdir');
	queries.push('DROP TABLE IF EXISTS items_fts_stat');
	queries.push('DROP TABLE IF EXISTS items_fts_docsize');

	// Create notes_normalized if it doesn't exist. It may be missing if
	// migration 33 failed (e.g. FTS4 was not available on web).
	const notesNormalized = `
		CREATE TABLE IF NOT EXISTS notes_normalized (
			id TEXT NOT NULL,
			title TEXT NOT NULL DEFAULT "",
			body TEXT NOT NULL DEFAULT "",
			user_created_time INT NOT NULL DEFAULT 0,
			user_updated_time INT NOT NULL DEFAULT 0,
			is_todo INT NOT NULL DEFAULT 0,
			todo_completed INT NOT NULL DEFAULT 0,
			parent_id TEXT NOT NULL DEFAULT "",
			latitude NUMERIC NOT NULL DEFAULT 0,
			longitude NUMERIC NOT NULL DEFAULT 0,
			altitude NUMERIC NOT NULL DEFAULT 0,
			source_url TEXT NOT NULL DEFAULT "",
			todo_due INT NOT NULL DEFAULT 0
		);
	`;

	queries.push(sqlStringToLines(notesNormalized)[0]);

	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_id ON notes_normalized (id)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_user_created_time ON notes_normalized (user_created_time)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_user_updated_time ON notes_normalized (user_updated_time)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_is_todo ON notes_normalized (is_todo)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_todo_completed ON notes_normalized (todo_completed)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_parent_id ON notes_normalized (parent_id)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_latitude ON notes_normalized (latitude)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_longitude ON notes_normalized (longitude)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_altitude ON notes_normalized (altitude)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_source_url ON notes_normalized (source_url)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS notes_normalized_todo_due ON notes_normalized (todo_due)',
	);

	// Create items_normalized if it doesn't exist. It may be missing if
	// migration 45 failed (e.g. FTS4 was not available on web).
	const itemsNormalized = `
		CREATE TABLE IF NOT EXISTS items_normalized (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL DEFAULT "",
			body TEXT NOT NULL DEFAULT "",
			item_id TEXT NOT NULL,
			item_type INT NOT NULL,
			user_updated_time INT NOT NULL DEFAULT 0,
			reserved1 INT NULL,
			reserved2 INT NULL,
			reserved3 INT NULL,
			reserved4 INT NULL,
			reserved5 INT NULL,
			reserved6 INT NULL
		);
	`;

	queries.push(sqlStringToLines(itemsNormalized)[0]);

	queries.push(
		'CREATE INDEX IF NOT EXISTS items_normalized_id ON items_normalized (id)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS items_normalized_item_id ON items_normalized (item_id)',
	);
	queries.push(
		'CREATE INDEX IF NOT EXISTS items_normalized_item_type ON items_normalized (item_type)',
	);

	// Create FTS5 virtual table for notes
	const noteTableFields =
    'id, title, body, user_created_time, user_updated_time, is_todo, todo_completed, parent_id, latitude, longitude, altitude, source_url';

	const notesFts5 = `
		CREATE VIRTUAL TABLE notes_fts USING fts5(
			id UNINDEXED,
			title,
			body,
			user_created_time UNINDEXED,
			user_updated_time UNINDEXED,
			is_todo UNINDEXED,
			todo_completed UNINDEXED,
			parent_id UNINDEXED,
			latitude UNINDEXED,
			longitude UNINDEXED,
			altitude UNINDEXED,
			source_url UNINDEXED,
			content='notes_normalized',
			content_rowid='rowid'
		);
	`;

	queries.push(sqlStringToLines(notesFts5)[0]);

	// FTS5 triggers for notes. FTS5 uses a special "delete" command
	// instead of DELETE FROM for content-sync tables.
	queries.push(`
		CREATE TRIGGER notes_fts_before_update BEFORE UPDATE ON notes_normalized BEGIN
			INSERT INTO notes_fts(notes_fts, rowid, ${noteTableFields})
			VALUES('delete', old.rowid, old.id, old.title, old.body, old.user_created_time, old.user_updated_time, old.is_todo, old.todo_completed, old.parent_id, old.latitude, old.longitude, old.altitude, old.source_url);
		END`);
	queries.push(`
		CREATE TRIGGER notes_fts_before_delete BEFORE DELETE ON notes_normalized BEGIN
			INSERT INTO notes_fts(notes_fts, rowid, ${noteTableFields})
			VALUES('delete', old.rowid, old.id, old.title, old.body, old.user_created_time, old.user_updated_time, old.is_todo, old.todo_completed, old.parent_id, old.latitude, old.longitude, old.altitude, old.source_url);
		END`);
	queries.push(`
		CREATE TRIGGER notes_after_update AFTER UPDATE ON notes_normalized BEGIN
			INSERT INTO notes_fts(rowid, ${noteTableFields}) SELECT rowid, ${noteTableFields} FROM notes_normalized WHERE new.rowid = notes_normalized.rowid;
		END`);
	queries.push(`
		CREATE TRIGGER notes_after_insert AFTER INSERT ON notes_normalized BEGIN
			INSERT INTO notes_fts(rowid, ${noteTableFields}) SELECT rowid, ${noteTableFields} FROM notes_normalized WHERE new.rowid = notes_normalized.rowid;
		END`);

	// Create FTS5 virtual table for items
	const itemTableFields =
    'id, title, body, item_id, item_type, user_updated_time, reserved1, reserved2, reserved3, reserved4, reserved5, reserved6';

	const itemsFts5 = `
		CREATE VIRTUAL TABLE items_fts USING fts5(
			id UNINDEXED,
			title,
			body,
			item_id UNINDEXED,
			item_type UNINDEXED,
			user_updated_time UNINDEXED,
			reserved1 UNINDEXED,
			reserved2 UNINDEXED,
			reserved3 UNINDEXED,
			reserved4 UNINDEXED,
			reserved5 UNINDEXED,
			reserved6 UNINDEXED,
			content='items_normalized',
			content_rowid='rowid'
		);
	`;

	queries.push(sqlStringToLines(itemsFts5)[0]);

	// FTS5 triggers for items
	queries.push(`
		CREATE TRIGGER items_fts_before_update BEFORE UPDATE ON items_normalized BEGIN
			INSERT INTO items_fts(items_fts, rowid, ${itemTableFields})
			VALUES('delete', old.rowid, old.id, old.title, old.body, old.item_id, old.item_type, old.user_updated_time, old.reserved1, old.reserved2, old.reserved3, old.reserved4, old.reserved5, old.reserved6);
		END`);
	queries.push(`
		CREATE TRIGGER items_fts_before_delete BEFORE DELETE ON items_normalized BEGIN
			INSERT INTO items_fts(items_fts, rowid, ${itemTableFields})
			VALUES('delete', old.rowid, old.id, old.title, old.body, old.item_id, old.item_type, old.user_updated_time, old.reserved1, old.reserved2, old.reserved3, old.reserved4, old.reserved5, old.reserved6);
		END`);
	queries.push(`
		CREATE TRIGGER items_after_update AFTER UPDATE ON items_normalized BEGIN
			INSERT INTO items_fts(rowid, ${itemTableFields}) SELECT rowid, ${itemTableFields} FROM items_normalized WHERE new.rowid = items_normalized.rowid;
		END`);
	queries.push(`
		CREATE TRIGGER items_after_insert AFTER INSERT ON items_normalized BEGIN
			INSERT INTO items_fts(rowid, ${itemTableFields}) SELECT rowid, ${itemTableFields} FROM items_normalized WHERE new.rowid = items_normalized.rowid;
		END`);

	// Reset search engine indexing to force re-index with the new FTS5 tables
	queries.push({
		sql: 'UPDATE settings SET value = \'0\' WHERE key = \'searchEngine.initialIndexingDone\'',
		params: [],
	});
	queries.push({
		sql: 'UPDATE settings SET value = \'0\' WHERE key = \'searchEngine.lastProcessedChangeId\'',
		params: [],
	});
	queries.push({
		sql: 'UPDATE settings SET value = \'\' WHERE key = \'searchEngine.lastProcessedResource\'',
		params: [],
	});
	queries.push({
		sql: 'UPDATE settings SET value = \'-1\' WHERE key = \'db.ftsEnabled\'',
		params: [],
	});

	return queries;
};
