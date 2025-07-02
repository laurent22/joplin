import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

export interface AIHistory {
	id: string;
	text: string; isUser: boolean;
	loading?: boolean;
}

const sendMessage = async (question: string, replyId: string, histories: Array<AIHistory>, replyFunc: (msg: string, id?: string)=> string) => {
	const model = new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.JOPLIN_OAI_KEY });
	const historyMessages = histories.flatMap(h => {
		if (!h.text) return [];
		return h.isUser
			? [new HumanMessage(h.text)]
			: [new AIMessage(h.text)];
	});
	const messages = [
		new SystemMessage('なるべく丁寧に回答して下さい。'),
		...historyMessages,
		new HumanMessage(question),
	];

	let response = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const content = typeof chunk.content === 'string' ? chunk.content : '';
		response += content;
		replyFunc(response, replyId);
	}

	return response;
};

export default sendMessage;
