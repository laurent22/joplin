import BaseModel, { ModelType } from '../BaseModel';
import Folder from './Folder';
import Note from './Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import ChatConversation, { ChatHistoryMessage } from './ChatConversation';
import ChatMessage from './ChatMessage';
import uuid from '../uuid';
import { ChatRole, ChatStandardMessage, ChatToolMessage } from '../services/ai/types';

const makeMessage = (props: Partial<ChatHistoryMessage> = {}): ChatHistoryMessage => ({
	id: uuid.create(), createdTime: 100, role: 'user', text: 'Question', raw: [], noteId: '', noteTitle: '', ...props,
});

describe('ChatConversation', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		BaseModel.dispatch = jest.fn();
	});

	afterEach(() => {
		BaseModel.dispatch = () => {};
	});

	it('should fill the conversation from the first message, save it through the message model and dispatch it', async () => {
		const id = uuid.create();
		const message = makeMessage();
		await ChatConversation.addMessage(id, message);
		const conversation = await ChatConversation.load(id);
		expect(conversation).toMatchObject({ id, title: 'Question', created_time: 100, updated_time: 100, type_: ModelType.ChatConversation });
		expect(await ChatMessage.load(message.id)).toMatchObject({ conversation_id: id, position: 0, created_time: 100, type_: ModelType.ChatMessage });
		expect(BaseModel.modelNameToType('chat_message')).toBe(ModelType.ChatMessage);
		expect(await ChatConversation.messages(id)).toEqual([{ ...message, hide: false }]);
		expect(BaseModel.dispatch).toHaveBeenCalledWith({ type: 'AI_CHAT_APPEND', conversationId: id, message });
	});

	it('should keep messages in order and only bump updated_time for user and assistant messages', async () => {
		const id = uuid.create();
		const first = makeMessage({ role: 'error', text: 'Open a note to start chatting.', createdTime: 100 });
		const second = makeMessage({ role: 'user', text: 'Hello', createdTime: 200 });
		const third = makeMessage({ role: 'separator', text: 'Note B', createdTime: 300 });
		await Promise.all([first, second, third].map(message => ChatConversation.addMessage(id, message)));
		expect(await ChatConversation.load(id)).toMatchObject({ title: 'Hello', created_time: 100, updated_time: 200 });
		expect((await ChatConversation.messages(id)).map(message => message.text)).toEqual([first.text, second.text, third.text]);
	});

	it('should rename a conversation without changing its last-message timestamp or messages', async () => {
		const id = uuid.create();
		const message = makeMessage();
		await ChatConversation.addMessage(id, message);
		await ChatConversation.renameConversation(id, 'Renamed');
		expect(await ChatConversation.load(id)).toMatchObject({ title: 'Renamed', updated_time: 100 });
		await ChatConversation.addMessage(id, makeMessage({ text: 'Another question', createdTime: 200 }));
		expect(await ChatConversation.load(id)).toMatchObject({ title: 'Renamed', updated_time: 200 });
	});

	it('should remove a message and add tool results to the matching assistant message', async () => {
		const id = uuid.create();
		const removed = makeMessage({ createdTime: 100 });
		const assistantTurn: ChatStandardMessage = { role: ChatRole.Assistant, content: '', toolCalls: [{ toolName: 'search', callId: 'call-1', arguments: {}, parseError: null }] };
		const assistant = makeMessage({ role: 'assistant', text: '', raw: [assistantTurn], createdTime: 200 });
		await ChatConversation.addMessage(id, removed);
		await ChatConversation.addMessage(id, assistant);
		await ChatConversation.removeMessage(id, removed.id);
		const toolResult: ChatToolMessage = { role: ChatRole.Tool, content: 'result', toolName: 'search', toolCallId: 'call-1', isError: false, userDescription: '', isEdit: false };
		await ChatConversation.addToolResult(id, toolResult);
		expect(await ChatConversation.messages(id)).toEqual([{ ...assistant, hide: false, raw: [assistantTurn, toolResult] }]);
		expect(BaseModel.dispatch).toHaveBeenCalledWith({ type: 'AI_CHAT_REMOVE', conversationId: id, id: removed.id });
		expect(BaseModel.dispatch).toHaveBeenCalledWith({ type: 'AI_CHAT_ADD_TOOL_RESULT', conversationId: id, toolCall: toolResult });
	});

	it('should delete the conversation and its messages', async () => {
		const id = uuid.create();
		const kept = uuid.create();
		await ChatConversation.addMessage(id, makeMessage());
		await ChatConversation.addMessage(kept, makeMessage({ text: 'Keep' }));
		await ChatConversation.deleteConversation(id);
		expect(await ChatConversation.load(id)).toBeFalsy();
		expect(await ChatMessage.byConversationId(id)).toEqual([]);
		expect((await ChatConversation.history()).map(conversation => conversation.id)).toEqual([kept]);
		expect(await ChatConversation.messages(kept)).toMatchObject([{ text: 'Keep' }]);
	});

	it('should keep saved note snapshots and separator text after the note is deleted', async () => {
		const folder = await Folder.save({ title: 'Notebook' });
		const note = await Note.save({ title: 'Original title', parent_id: folder.id });
		const id = uuid.create();
		await ChatConversation.addMessage(id, makeMessage({ role: 'separator', text: 'Note: Original title', noteId: note.id, noteTitle: note.title }));
		await Note.delete(note.id, { toTrash: false });
		expect(await ChatConversation.load(id)).toMatchObject({ title: '', created_time: 100, updated_time: 100 });
		expect(await ChatConversation.messages(id)).toMatchObject([{ text: 'Note: Original title', noteId: note.id, noteTitle: 'Original title' }]);
	});
});
