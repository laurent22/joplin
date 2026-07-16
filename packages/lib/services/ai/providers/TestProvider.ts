import { ChatMessage, ChatOptions, ChatResult, ChatRole, ChatToolCall, ProviderClassification, ToolSpec } from '../types';
import ChatProviderBase from './ChatProviderBase';

const parseUserCommand = (message: ChatMessage, availableTools: ToolSpec[]) => {
	const toolCalls: ChatToolCall[] = [];
	const reply = [];
	let repeat = 0;
	for (const line of message.content.split('\n')) {
		const command = line.match(/^\/(tool|reply-with|repeat) (.*)$/);
		if (!command) continue;

		if (command[1] === 'tool') {
			const args = command[2].split(' ');
			const toolName = args[0];
			if (!availableTools.some(tool => tool.name === toolName)) {
				reply.push(`tool not found: ${toolName}`);
			} else {
				toolCalls.push({
					callId: `tool-call-${toolCalls.length}`,
					toolName: args[0],
					arguments: JSON.parse(args.slice(1).join(' ')),
				});
			}
		} else if (command[1] === 'reply-with') {
			reply.push(command[2]);
		} else if (command[1] === 'repeat') {
			repeat = Number(command[2]);
		}
	}

	return { toolCalls, reply: reply.join('\n'), repeat };
};


export default class TestProvider extends ChatProviderBase {

	public id = 'test-provider';
	public classification: ProviderClassification = 'local';

	public constructor() {
		super();
	}

	protected async doChat(messages: ChatMessage[], { tools = [] }: ChatOptions = {}): Promise<ChatResult> {
		const lastMessage = messages[messages.length - 1];

		const toolCalls: ChatToolCall[] = [];
		const content = [];
		if (lastMessage.role === ChatRole.User) {
			const command = parseUserCommand(lastMessage, tools);
			toolCalls.push(...command.toolCalls);
			content.push(command.reply);
		} else if (lastMessage.role === ChatRole.Tool) {
			let lastUserMessage;
			let replyCount = 0;
			for (let i = messages.length - 1; i >= 0; i--) {
				if (messages[i].role === ChatRole.User) {
					lastUserMessage = messages[i];
					break;
				}
				if (messages[i].role === ChatRole.Assistant) {
					replyCount ++;
				}
			}

			if (lastUserMessage) {
				const command = parseUserCommand(lastUserMessage, tools);
				if (command.repeat >= replyCount) {
					toolCalls.push(...command.toolCalls);
				}
				content.push(command.reply);
			}
		}

		const output = content.join(' ');
		const inputTokens = lastMessage.content.length;
		const outputTokens = output.length + toolCalls.length;
		return { text: output, toolCalls, usage: { inputTokens, outputTokens } };
	}
}
