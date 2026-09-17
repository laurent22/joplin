import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import BaseModel from '@joplin/lib/BaseModel';
import { AiChatMessage } from '../../../app.reducer';

export const declaration: CommandDeclaration = {
	name: 'openAiChatConversation',
};

export const runtime = (): CommandRuntime => ({
	execute: async (context: CommandContext, conversationId: string) => {
		const db = BaseModel.db();
		const conversation = await db.selectOne('SELECT id FROM chat_conversations WHERE id = ?', [conversationId]);
		if (!conversation) throw new Error(`No such chat conversation: ${conversationId}`);

		const rows = await db.selectAll('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY position', [conversationId]);
		const messages: AiChatMessage[] = rows.map(row => ({
			id: row.id,
			role: row.role,
			text: row.text,
			raw: JSON.parse(row.raw),
			hide: !!row.hide,
			noteId: row.note_id,
			noteTitle: row.note_title,
		}));
		context.dispatch({ type: 'AI_CHAT_OPEN', windowId: context.state.windowId, conversationId, messages });
		context.dispatch({
			type: 'WINDOW_LAYOUT_SET_ITEM_PROP', windowId: context.state.windowId,
			itemKey: 'chatPanel', propName: 'visible', propValue: true,
		});
	},
});
