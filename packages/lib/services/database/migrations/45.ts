import sqlStringToLines from '../sqlStringToLines';
import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	const queries: (SqlQuery|string)[] = [];

	queries.push('ALTER TABLE `resources` ADD COLUMN `ocr_text` TEXT NOT NULL DEFAULT ""');
	queries.push('ALTER TABLE `resources` ADD COLUMN `ocr_details` TEXT NOT NULL DEFAULT ""');
	queries.push('ALTER TABLE `resources` ADD COLUMN `ocr_status` INT NOT NULL DEFAULT 0');
	queries.push('ALTER TABLE `resources` ADD COLUMN `ocr_error` TEXT NOT NULL DEFAULT ""');

	const itemsNormalized = `
		CREATE TABLE items_normalized (
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

	queries.push('CREATE INDEX items_normalized_id ON items_normalized (id)');
	queries.push('CREATE INDEX items_normalized_item_id ON items_normalized (item_id)');
	queries.push('CREATE INDEX items_normalized_item_type ON items_normalized (item_type)');

	const tableFields = 'id, title, body, item_id, item_type, user_updated_time, reserved1, reserved2, reserved3, reserved4, reserved5, reserved6';

	const newVirtualTableSql = `
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
			${tableFields}
		);`
	;

	queries.push(sqlStringToLines(newVirtualTableSql)[0]);

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
			INSERT INTO items_fts(docid, ${tableFields}) SELECT rowid, ${tableFields} FROM items_normalized WHERE new.rowid = items_normalized.rowid;
		END;`);
	queries.push(`
		CREATE TRIGGER items_after_insert AFTER INSERT ON items_normalized BEGIN
			INSERT INTO items_fts(docid, ${tableFields}) SELECT rowid, ${tableFields} FROM items_normalized WHERE new.rowid = items_normalized.rowid;
		END;`);

	return queries;
};
