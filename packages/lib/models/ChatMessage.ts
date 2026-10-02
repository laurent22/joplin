import BaseModel, { ModelType } from '../BaseModel';
import { ChatMessageEntity } from '../services/database/types';

export default class ChatMessage extends BaseModel {
	public static tableName() {
		return 'chat_messages';
	}

	public static modelType() {
		return ModelType.ChatMessage;
	}

	public static useUuid() {
		return true;
	}

	public static async byConversationId(conversationId: string): Promise<ChatMessageEntity[]> {
		return this.modelSelectAll('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY position', [conversationId]);
	}

	public static async byToolCallId(conversationId: string, toolCallId: string): Promise<ChatMessageEntity[]> {
		return this.modelSelectAll('SELECT * FROM chat_messages WHERE conversation_id = ? AND role = ? AND instr(raw, ?) > 0 ORDER BY position', [conversationId, 'assistant', toolCallId]);
	}

	public static async nextPosition(conversationId: string) {
		const row = await this.db().selectOne('SELECT MAX(position) AS position FROM chat_messages WHERE conversation_id = ?', [conversationId]);
		return row.position === null ? 0 : row.position + 1;
	}

	public static async deleteByConversationId(conversationId: string) {
		await this.batchDelete([conversationId], { idFieldName: 'conversation_id' });
	}
}
