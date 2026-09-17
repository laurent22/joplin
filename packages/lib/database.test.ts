import { setupDatabaseAndSynchronizer, switchClient } from './testing/test-utils';
import BaseModel from './BaseModel';
import JoplinDatabase from './JoplinDatabase';
import { DatabaseDriverNode } from './database-driver-node';

describe('database', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should keep chat conversations and messages when reopening the database', async () => {
		const db = BaseModel.db();
		const databases = await db.selectAll('PRAGMA database_list');
		const databasePath = databases.find(database => database.name === 'main').file;
		await db.exec('INSERT INTO chat_conversations (id, title, created_time, updated_time) VALUES (?, ?, ?, ?)', ['chat-1', 'Explain this note', 100, 100]);
		const raw = JSON.stringify([{ role: 'user', content: 'Explain this note' }]);
		await db.exec('INSERT INTO chat_messages (id, conversation_id, role, text, raw, position, created_time) VALUES (?, ?, ?, ?, ?, ?, ?)', ['message-1', 'chat-1', 'user', 'Explain this note', raw, 0, 100]);
		await db.close();

		const reopened = new JoplinDatabase(new DatabaseDriverNode());
		try {
			await reopened.open({ name: databasePath });
			expect(await reopened.selectOne('SELECT * FROM chat_conversations WHERE id = ?', ['chat-1'])).toEqual({
				id: 'chat-1', title: 'Explain this note', created_time: 100, updated_time: 100, archived: 0,
			});
			expect(await reopened.selectOne('SELECT * FROM chat_messages WHERE id = ?', ['message-1'])).toEqual({
				id: 'message-1', conversation_id: 'chat-1', role: 'user', text: 'Explain this note', raw,
				position: 0, created_time: 100, hide: 0, note_id: '', note_title: '',
			});
		} finally {
			await reopened.close();
			await db.open({ name: databasePath });
		}
	});

	it('should not modify cached field names', (async () => {
		const db = BaseModel.db();

		const fieldNames = db.tableFieldNames('notes');
		const fieldCount = fieldNames.length;
		fieldNames.push('type_');

		expect(fieldCount).toBeGreaterThan(0);
		expect(db.tableFieldNames('notes').length).toBe(fieldCount);
	}));

});
