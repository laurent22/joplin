import JoplinDatabase from '../../JoplinDatabase';
import { ChatMessage } from './types';

interface Message {
	id: string;
	noteId: string;
	noteTitle: string;
	role: 'user' | 'assistant' | 'error' | 'separator';
	text: string;
	raw: ChatMessage[];
	hide?: boolean;
}

export default async (conversationId: string, messages: Message[], db: JoplinDatabase) => {
	await db.transactionExecBatch(messages.map(message => ({
		sql: `INSERT INTO chat_messages (id, conversation_id, role, text, raw, hide, position, created_time, note_id, note_title)
			SELECT ?, ?, ?, ?, ?, ?, COALESCE(MAX(position), -1) + 1, ?, ?, ?
			FROM chat_messages WHERE conversation_id = ?`,
		params: [message.id, conversationId, message.role, message.text, JSON.stringify(message.raw), message.hide ? 1 : 0, Date.now(), message.noteId, message.noteTitle, conversationId],
	})));
};
