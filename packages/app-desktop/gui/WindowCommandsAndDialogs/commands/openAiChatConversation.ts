import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import ChatConversation from '@joplin/lib/models/ChatConversation';

export const declaration: CommandDeclaration = {
	name: 'openAiChatConversation',
};

export const runtime = (): CommandRuntime => ({
	execute: async (context: CommandContext, conversationId: string) => {
		const messages = await ChatConversation.messages(conversationId);
		context.dispatch({ type: 'AI_CHAT_OPEN', windowId: context.state.windowId, conversationId, messages });
		context.dispatch({
			type: 'WINDOW_LAYOUT_SET_ITEM_PROP', windowId: context.state.windowId,
			itemKey: 'chatPanel', propName: 'visible', propValue: true,
		});
	},
});
