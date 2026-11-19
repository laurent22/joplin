import { setupDatabaseAndSynchronizer, switchClient } from './testing/test-utils';
import BaseModel from './BaseModel';
import Note from './models/Note';
import Folder from './models/Folder';

describe('database', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should not modify cached field names', (async () => {
		const db = BaseModel.db();

		const fieldNames = db.tableFieldNames('notes');
		const fieldCount = fieldNames.length;
		fieldNames.push('type_');

		expect(fieldCount).toBeGreaterThan(0);
		expect(db.tableFieldNames('notes').length).toBe(fieldCount);
	}));

	it('should escape fields', async () => {
		const db = BaseModel.db();

		expect(db.escapeField('*')).toBe('*');
		expect(db.escapeField('a.b')).toBe('`a`.`b`');
		expect(db.escapeField('a !.b')).toBe('`a !`.`b`');
	});

	it('should escape fields in a way that allows selecting from a specific table in a JOIN', async () => {
		const db = BaseModel.db();
		const folder = await Folder.save({ title: 'folder title' });
		await Note.save({ title: 'note title', parent_id: folder.id });

		const testQuery = `
			SELECT ${db.escapeFieldsToString(['notes.title', 'folders.id'])}
			FROM notes
			JOIN folders ON ${db.escapeField('notes.parent_id')} = ${db.escapeField('folders.id')}
		`;
		expect(await db.selectAll(testQuery)).toEqual([
			{ 'title': 'note title', 'id': folder.id },
		]);
	});

	it('should throw when a field name cannot be escaped', async () => {
		const db = BaseModel.db();

		const invalidFormatPattern = /Invalid field format:/;
		expect(() => db.escapeField('...')).toThrow(invalidFormatPattern);
		expect(() => db.escapeField('`')).toThrow(invalidFormatPattern);
	});
});
