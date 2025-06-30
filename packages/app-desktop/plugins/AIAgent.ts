import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const sendMessage = async (question: string) => {
	const model = new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.JOPLIN_OAI_KEY });
	const messages = [
		new SystemMessage('なるべく丁寧に回答して下さい。'),
		new HumanMessage(question),
	];

	const response = await model.invoke(messages);
	return response.content.toString();
};

export default sendMessage;



