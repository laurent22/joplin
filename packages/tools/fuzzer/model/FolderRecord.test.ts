import FolderRecord from './FolderRecord';
import Folder from '@joplin/lib/models/Folder';
import { afterAllCleanUp, afterEachCleanUp, setupDatabase } from '@joplin/lib/testing/test-utils';
const { shimInit } = require('@joplin/lib/shim-init-node');
const sqlite3 = require('sqlite3');

describe('FolderRecord', () => {
	beforeAll(() => {
		shimInit({ nodeSqlite: sqlite3 });
	});
	afterAll(afterAllCleanUp);
	afterEach(afterEachCleanUp);

	beforeEach(async () => {
		await setupDatabase();
	});

	it('should remove leading /s from titles for consistency with the Folder model', async () => {
		const record = new FolderRecord({
			title: '//test',
			id: '1234567890abcdef1234567890abcdef',
			parentId: '',
			childIds: [],
			isShared: false,
			sharedWith: [],
			ownedByEmail: '',
		});

		const folder = await Folder.save({ title: '//test' }, { userSideValidation: true });
		expect(record.title).toBe('test');
		expect(record.title).toBe(folder.title);
	});
});
