import BaseModel from '@joplin/lib/BaseModel';
import uuid from '@joplin/lib/uuid';
import { AiChatMessage } from '../../app.reducer';

export default async (conversationId: string, messages: AiChatMessage[]) => {
	if (!messages.length) return;

	const id = conversationId || uuid.create();
	const now = Date.now();
	const title = (messages.find(message => message.role === 'user')?.text ?? '').slice(0, 80);
	const lastMessage = messages.filter(message => message.role === 'user' || message.role === 'assistant').pop();
	const updatedTime = Number(lastMessage?.id.split('-')[1]) || 0;
	await BaseModel.db().transactionExecBatch([
		{
			sql: `INSERT INTO chat_conversations (id, title, created_time, updated_time, archived) VALUES (?, ?, ?, ?, 1)
				ON CONFLICT(id) DO UPDATE SET archived = 1, updated_time = MAX(chat_conversations.updated_time, ?),
				title = CASE WHEN chat_conversations.title = '' THEN excluded.title ELSE chat_conversations.title END`,
			params: [id, title, now, updatedTime || now, updatedTime],
		},
		...messages.map(message => ({
			sql: `INSERT INTO chat_messages (id, conversation_id, role, text, raw, hide, position, created_time, note_id, note_title)
				SELECT ?, ?, ?, ?, ?, ?, COALESCE(MAX(position), -1) + 1, ?, ?, ?
				FROM chat_messages WHERE conversation_id = ?
				ON CONFLICT(id) DO UPDATE SET raw = excluded.raw, text = excluded.text, hide = excluded.hide`,
			params: [message.id, id, message.role, message.text, JSON.stringify(message.raw), message.hide ? 1 : 0, now, message.noteId, message.noteTitle, id],
		})),
	]);
};
