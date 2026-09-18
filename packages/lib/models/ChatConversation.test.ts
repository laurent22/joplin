import BaseModel, { ModelType } from '../BaseModel';
import Folder from './Folder';
import Note from './Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import ChatConversation, { ChatHistoryMessage } from './ChatConversation';

describe('ChatConversation', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await BaseModel.db().exec('DELETE FROM chat_messages');
		await BaseModel.db().exec('DELETE FROM chat_conversations');
	});

	it('should create and load conversations through the base model', async () => {
		const id = await ChatConversation.createConversation();
		const conversation = await ChatConversation.load(id);
		expect(id).toMatch(/^[a-f0-9]{32}$/);
		expect(conversation).toMatchObject({ id, title: '', archived: 0, type_: ModelType.ChatConversation });
		expect(conversation.created_time).toBeGreaterThan(0);
		expect(conversation.updated_time).toBe(conversation.created_time);
		expect(BaseModel.modelTypeToName(conversation.type_)).toBe('chat_conversation');
		expect(BaseModel.modelNameToType('chat_conversation')).toBe(ModelType.ChatConversation);
		expect(await ChatConversation.messages(id)).toEqual([]);
	});

	it('should rename a conversation without changing its last-message timestamp or messages', async () => {
		const conversation = await ChatConversation.save({ title: 'Original', updated_time: 100 }, { autoTimestamp: false });
		const message: ChatHistoryMessage = { id: 'user-100', role: 'user', text: 'Question', raw: [], noteId: '', noteTitle: '' };
		await ChatConversation.archive(conversation.id, [message]);
		await ChatConversation.renameConversation(conversation.id, 'Renamed');
		expect(await ChatConversation.load(conversation.id)).toMatchObject({ title: 'Renamed', updated_time: 100 });
		expect(await ChatConversation.messages(conversation.id)).toEqual([{ ...message, hide: false }]);
	});

	it('should keep saved note snapshots and separator text after the note is deleted', async () => {
		const folder = await Folder.save({ title: 'Notebook' });
		const note = await Note.save({ title: 'Original title', parent_id: folder.id });
		await ChatConversation.archive('chat-1', [{ id: 'separator', role: 'separator', text: 'Note: Original title', raw: [], noteId: note.id, noteTitle: note.title }]);
		await Note.delete(note.id, { toTrash: false });
		expect(await ChatConversation.all({ fields: ['id'] })).toEqual([{ id: 'chat-1', type_: ModelType.ChatConversation }]);
		expect(await ChatConversation.messages('chat-1')).toEqual([{
			id: 'separator', role: 'separator', text: 'Note: Original title', raw: [], hide: false,
			noteId: note.id, noteTitle: 'Original title',
		}]);
	});
});
