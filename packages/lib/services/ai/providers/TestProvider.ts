import { ToolSpec } from '../tools/types';
import { ChatMessage, ChatOptions, ChatResult, ChatRole, ChatStandardMessage, ChatToolCall, ProviderClassification } from '../types';
import ChatProviderBase from './ChatProviderBase';

const parseUserCommand = (message: ChatStandardMessage, availableTools: ToolSpec[]) => {
	const toolCalls: ChatToolCall[] = [];
	const reply = [];
	let repeat = 0;
	for (const line of message.content.split('\n')) {
		const commandMatch = line.match(/^\/(tool|describe-tool|list-tools|reply-with|repeat)( .*)?$/);
		if (!commandMatch) continue;
		const command = commandMatch[1];
		const argument = (commandMatch[2] ?? '').replace(/^ /, '');

		const isToolCall = command === 'tool';
		const isDescribeToolRequest = command === 'describe-tool';
		if (isToolCall || isDescribeToolRequest) {
			const args = argument.split(' ');
			const toolName = args[0];
			const tool = availableTools.find(t => t.id === toolName);
			if (!tool) {
				reply.push(`tool not found: ${toolName}`);
			} else if (isDescribeToolRequest) {
				reply.push(`${toolName}: ${tool.description}`);
			} else {
				toolCalls.push({
					callId: `tool-call-${toolCalls.length}`,
					toolName: args[0],
					arguments: JSON.parse(args.slice(1).join(' ')),
					parseError: null,
				});
			}
		} else if (command === 'list-tools') {
			reply.push(JSON.stringify(availableTools));
		} else if (command === 'reply-with') {
			reply.push(argument);
		} else if (command === 'repeat') {
			repeat = Number(argument);
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
				const message = messages[i];
				if (message.role === ChatRole.User) {
					lastUserMessage = message;
					break;
				}
				if (message.role === ChatRole.Assistant) {
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
		const lastContent = lastMessage.content;
		const inputTokens = typeof lastContent === 'string' ? lastContent.length : lastContent.dataUrl.length;
		const outputTokens = output.length + toolCalls.length;
		return { text: output, toolCalls, usage: { inputTokens, outputTokens } };
	}
}
