import { Mutex } from 'async-mutex';
import BaseModel, { ModelType } from '../BaseModel';
import markdownUtils from '../markdownUtils';
import { ChatMessage as ChatTurn, ChatRole, ChatToolMessage } from '../services/ai/types';
import ChatMessage from './ChatMessage';

export interface ChatHistoryMessage {
	id: string;
	createdTime: number;
	noteId: string;
	noteTitle: string;
	role: 'user' | 'assistant' | 'error' | 'separator';
	text: string;
	raw: ChatTurn[];
	hide?: boolean;
}

interface Conversation {
	id: string;
	title: string;
	updated_time: number;
}

export default class ChatConversation extends BaseModel {
	private static messageMutex_ = new Mutex();

	public static tableName() {
		return 'chat_conversations';
	}

	public static modelType() {
		return ModelType.ChatConversation;
	}

	public static useUuid() {
		return true;
	}

	public static async history(search = ''): Promise<Conversation[]> {
		const searchQuery = search.trim().toLowerCase();
		if (!searchQuery) {
			return this.db().selectAll<Conversation>('SELECT id, title, updated_time FROM chat_conversations ORDER BY updated_time DESC');
		}

		return this.db().selectAll<Conversation>(`
			SELECT id, title, updated_time FROM chat_conversations
			WHERE instr(LOWER(title), ?) > 0
			OR EXISTS (
				SELECT 1 FROM chat_messages
				WHERE chat_messages.conversation_id = chat_conversations.id
				AND instr(LOWER(chat_messages.text), ?) > 0
			)
			ORDER BY updated_time DESC
		`, [searchQuery, searchQuery]);
	}

	public static async renameConversation(id: string, title: string) {
		await this.save({ id, title }, { autoTimestamp: false });
	}

	public static async deleteConversation(id: string) {
		await ChatMessage.deleteByConversationId(id);
		await this.delete(id);
	}

	public static async messages(conversationId: string): Promise<ChatHistoryMessage[]> {
		const conversation = await this.load(conversationId, { fields: ['id'] });
		if (!conversation) throw new Error(`No such chat conversation: ${conversationId}`);
		const rows = await ChatMessage.byConversationId(conversationId);
		return rows.map(row => ({
			id: row.id,
			createdTime: row.created_time,
			role: row.role as ChatHistoryMessage['role'],
			text: row.text,
			raw: JSON.parse(row.raw),
			hide: !!row.hide,
			noteId: row.note_id,
			noteTitle: row.note_title,
		}));
	}

	public static async addMessage(conversationId: string, message: ChatHistoryMessage) {
		const release = await this.messageMutex_.acquire();
		try {
			await this.saveForMessage(conversationId, message);
			await ChatMessage.save({
				id: message.id,
				conversation_id: conversationId,
				role: message.role,
				text: message.text,
				raw: JSON.stringify(message.raw),
				hide: message.hide ? 1 : 0,
				position: await ChatMessage.nextPosition(conversationId),
				created_time: message.createdTime,
				note_id: message.noteId,
				note_title: message.noteTitle,
			}, { isNew: true, autoTimestamp: false });
		} finally {
			release();
		}
		this.dispatch({ type: 'AI_CHAT_APPEND', conversationId, message });
	}

	public static async removeMessage(conversationId: string, id: string) {
		const release = await this.messageMutex_.acquire();
		try {
			await ChatMessage.delete(id);
		} finally {
			release();
		}
		this.dispatch({ type: 'AI_CHAT_REMOVE', conversationId, id });
	}

	public static async addToolResult(conversationId: string, toolCall: ChatToolMessage) {
		const release = await this.messageMutex_.acquire();
		try {
			for (const row of await ChatMessage.byToolCallId(conversationId, toolCall.toolCallId)) {
				const raw: ChatTurn[] = JSON.parse(row.raw);
				const isTarget = raw.some(entry => entry.role === ChatRole.Assistant && entry.toolCalls?.some(call => call.callId === toolCall.toolCallId));
				if (!isTarget) continue;
				raw.push(toolCall);
				await ChatMessage.save({ id: row.id, raw: JSON.stringify(raw) }, { autoTimestamp: false });
				break;
			}
		} finally {
			release();
		}
		this.dispatch({ type: 'AI_CHAT_ADD_TOOL_RESULT', conversationId, toolCall });
	}

	private static async saveForMessage(conversationId: string, message: ChatHistoryMessage) {
		const title = message.role === 'user' ? markdownUtils.titleFromBody(message.text) : '';
		const bumpsUpdatedTime = message.role === 'user' || message.role === 'assistant';
		const conversation = await this.load(conversationId, { fields: ['id', 'title', 'updated_time'] });
		if (!conversation) {
			await this.save({ id: conversationId, title, created_time: message.createdTime, updated_time: message.createdTime }, { isNew: true, autoTimestamp: false });
			return;
		}

		const newTitle = conversation.title || title;
		const newUpdatedTime = bumpsUpdatedTime ? Math.max(conversation.updated_time, message.createdTime) : conversation.updated_time;
		if (newTitle === conversation.title && newUpdatedTime === conversation.updated_time) return;
		await this.save({ id: conversationId, title: newTitle, updated_time: newUpdatedTime }, { autoTimestamp: false });
	}
}
