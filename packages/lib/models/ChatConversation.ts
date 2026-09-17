import BaseModel from '../BaseModel';
import Database from '../database';
import uuid from '../uuid';
import { ChatMessage } from '../services/ai/types';

export interface ChatHistoryMessage {
	id: string;
	noteId: string;
	noteTitle: string;
	role: 'user' | 'assistant' | 'error' | 'separator';
	text: string;
	raw: ChatMessage[];
	hide?: boolean;
}

interface Conversation {
	id: string;
	title: string;
	updated_time: number;
	messageTexts: string[];
}

export default class ChatConversation extends BaseModel {
	public static tableName() {
		return 'chat_conversations';
	}

	public static async history(): Promise<Conversation[]> {
		const rows = await this.db().selectAll<Omit<Conversation, 'messageTexts'>>('SELECT id, title, updated_time FROM chat_conversations ORDER BY updated_time DESC');
		const savedMessages = await this.db().selectAll<{ conversation_id: string; text: string }>('SELECT conversation_id, text FROM chat_messages');
		const conversationsById = new Map<string, Conversation>(rows.map(row => [row.id, { ...row, messageTexts: [] as string[] }]));
		for (const message of savedMessages) {
			conversationsById.get(message.conversation_id)?.messageTexts.push(message.text);
		}
		return [...conversationsById.values()];
	}

	public static async createConversation() {
		const id = uuid.create();
		const now = Date.now();
		await this.db().exec(Database.insertQuery(this.tableName(), { id, created_time: now, updated_time: now }));
		return id;
	}

	public static async renameConversation(id: string, title: string) {
		await this.db().exec(Database.updateQuery(this.tableName(), { title }, { id }));
	}

	public static async deleteConversation(id: string) {
		await this.db().transactionExecBatch([
			{ sql: 'DELETE FROM chat_messages WHERE conversation_id = ?', params: [id] },
			{ sql: 'DELETE FROM chat_conversations WHERE id = ?', params: [id] },
		]);
	}

	public static async messages(conversationId: string): Promise<ChatHistoryMessage[]> {
		const conversation = await this.db().selectOne('SELECT id FROM chat_conversations WHERE id = ?', [conversationId]);
		if (!conversation) throw new Error(`No such chat conversation: ${conversationId}`);
		const rows = await this.db().selectAll('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY position', [conversationId]);
		return rows.map(row => ({
			id: row.id,
			role: row.role,
			text: row.text,
			raw: JSON.parse(row.raw),
			hide: !!row.hide,
			noteId: row.note_id,
			noteTitle: row.note_title,
		}));
	}

	public static async archive(conversationId: string, messages: ChatHistoryMessage[]) {
		if (!messages.length) return;
		const id = conversationId || uuid.create();
		const now = Date.now();
		const title = (messages.find(message => message.role === 'user')?.text ?? '').slice(0, 80);
		const lastMessage = messages.filter(message => message.role === 'user' || message.role === 'assistant').pop();
		const updatedTime = Number(lastMessage?.id.split('-')[1]) || 0;
		await this.db().transactionExecBatch([
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
	}
}
