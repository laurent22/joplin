import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import archiveConversation from './archiveConversation';

describe('archiveConversation', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await BaseModel.db().exec('DELETE FROM chat_messages');
		await BaseModel.db().exec('DELETE FROM chat_conversations');
	});

	it('should keep saved note snapshots and separator text after the note is deleted', async () => {
		const folder = await Folder.save({ title: 'Notebook' });
		const note = await Note.save({ title: 'Original title', parent_id: folder.id });
		await archiveConversation('chat-1', [{ id: 'separator', role: 'separator', text: 'Note: Original title', raw: [], noteId: note.id, noteTitle: note.title }]);
		await Note.delete(note.id, { toTrash: false });
		expect(await BaseModel.db().selectOne('SELECT id FROM chat_conversations')).toEqual({ id: 'chat-1' });
		expect(await BaseModel.db().selectOne('SELECT text, note_id, note_title FROM chat_messages')).toEqual({
			text: 'Note: Original title', note_id: note.id, note_title: 'Original title',
		});
	});
});
