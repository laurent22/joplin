import { ChatFinishReason, ChatMessage, ChatOptions, ChatResult, ChatRole, ChatToolCall } from '../types';
import { ToolSpec } from '../tools/types';
import extractReasoning from '../utils/extractReasoning';
import parseToolArguments from '../utils/parseToolArguments';

interface ResponsesContentPart {
	type: string;
	text?: string;
}

interface ResponsesOutputItem {
	type: string;
	content?: ResponsesContentPart[];
	summary?: ResponsesContentPart[];
	call_id?: string;
	name?: string;
	arguments?: string;
}

export interface ResponsesApiResponse {
	output?: ResponsesOutputItem[];
	status?: string;
	incomplete_details?: { reason?: string }|null;
	usage?: { input_tokens?: number; output_tokens?: number };
	error?: { message?: string }|null;
}

const convertTool = (tool: ToolSpec) => {
	return {
		type: 'function',
		name: tool.id,
		description: tool.description,
		parameters: tool.inputSchema,
	};
};

const convertMessage = (message: ChatMessage, replayKey: string): unknown[] => {
	if (message.role === ChatRole.Tool) {
		const content = message.content;
		return [{
			type: 'function_call_output',
			call_id: message.toolCallId,
			output: typeof content === 'string' ? content : [{ type: 'input_image', image_url: content.dataUrl }],
		}];
	}

	if (message.responsesState?.key === replayKey) {
		return message.responsesState.items;
	}

	const textItems = message.content || message.role !== ChatRole.Assistant ? [{ role: message.role, content: message.content }] : [];

	return [
		...textItems,
		...(message.toolCalls ?? []).map(call => ({
			type: 'function_call',
			call_id: call.callId,
			name: call.toolName,
			arguments: JSON.stringify(call.arguments),
		})),
	];
};

export const toResponsesBody = (model: string, messages: ChatMessage[], options: ChatOptions|undefined, replayKey: string) => {
	const body: Record<string, unknown> = {
		model,
		input: messages.flatMap(message => convertMessage(message, replayKey)),
		stream: false,
		store: false,
		include: ['reasoning.encrypted_content'],
	};
	if (options?.temperature !== undefined) body.temperature = options.temperature;
	if (options?.maxTokens !== undefined) body.max_output_tokens = options.maxTokens;
	if (options?.responseFormat !== undefined) body.text = { format: { type: 'json_schema', ...options.responseFormat.json_schema } };
	if (options?.tools?.length) body.tools = options.tools.map(convertTool);
	return body;
};

const toChatFinishReason = (json: ResponsesApiResponse, hasToolCalls: boolean): ChatFinishReason|undefined => {
	if (json.status === 'incomplete') return json.incomplete_details?.reason === 'max_output_tokens' ? 'length' : 'other';
	if (hasToolCalls) return 'tool_calls';
	if (json.status === 'completed') return 'stop';
	return json.status ? 'other' : undefined;
};

const partsText = (parts: ResponsesContentPart[], type: string) => {
	return parts.filter(part => part.type === type).map(part => part.text ?? '');
};

export const fromResponsesJson = (json: ResponsesApiResponse, replayKey: string): ChatResult => {
	const output = json.output ?? [];

	const rawText = partsText(output.filter(item => item.type === 'message').flatMap(item => item.content ?? []), 'output_text').join('');
	const { text, reasoning: inlineReasoning } = extractReasoning(rawText);
	const reasoningItems = output.filter(item => item.type === 'reasoning');
	const summaryText = partsText(reasoningItems.flatMap(item => item.summary ?? []), 'summary_text').join('\n\n');
	// LM Studio sends the reasoning in `content` instead of `summary`
	const reasoningContentText = partsText(reasoningItems.flatMap(item => item.content ?? []), 'reasoning_text').join('\n\n');

	const toolCalls: ChatToolCall[] = output.filter(item => item.type === 'function_call').map(call => {
		const { args, parseError } = parseToolArguments(call.arguments ?? '');
		return {
			toolName: call.name,
			callId: call.call_id,
			arguments: args,
			parseError,
		};
	});

	const replayItems = output.filter(item => item.type === 'reasoning' || item.type === 'message' || item.type === 'function_call');

	return {
		text,
		toolCalls,
		usage: {
			inputTokens: json.usage?.input_tokens ?? 0,
			outputTokens: json.usage?.output_tokens ?? 0,
		},
		finishReason: toChatFinishReason(json, toolCalls.length > 0),
		reasoningText: summaryText || reasoningContentText || inlineReasoning || undefined,
		responsesState: toolCalls.length ? { key: replayKey, items: replayItems } : undefined,
	};
};
