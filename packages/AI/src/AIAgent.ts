import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const sendMessage = async (question: string, replyFunc: (msg: string, id?: string)=> string) => {
	const model = new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.JOPLIN_OAI_KEY });
	const messages = [
		new SystemMessage('なるべく丁寧に回答して下さい。'),
		new HumanMessage(question),
	];

	let response = '';
	const stream = await model.stream(messages);
	let id: string | undefined = undefined;
	for await (const chunk of stream) {
		const content = typeof chunk.content === 'string' ? chunk.content : '';
		response += content;
		if (!id) {
			id = replyFunc(response);
		} else {
			id = replyFunc(response, id);
		}
	}

	return response;
};

export default sendMessage;
