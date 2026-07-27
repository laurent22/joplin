import AiService from './AiService';
import { ChatMessage, ChatResult, ChatRole, ChatToolCall, ChatToolMessage, ToolSpec } from './types';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import findFencedBlock from './utils/findFencedBlock';
import { applyAnchorEdits, supportedStructuredBlockTags } from './applyNoteEdits';
import { hasOwnProperty } from '@joplin/utils/object';
const Countable = require('../../countable/Countable');
import { _, _n } from '../../locale';

const logger = Logger.create('noteChat');

// Budget for system + history + user turn. Leaves headroom for the reply.
// Oversize payloads are refused rather than truncated — see runNoteChat.
const noteBodyTokenBudget = 80000;

const charsPerToken = 4;

export type EditOp =
	| { op: 'replaceSelection'; text: string }
	| { op: 'insertBefore'; anchor: string; text: string }
	| { op: 'insertAfter'; anchor: string; text: string }
	| { op: 'appendToNote'; text: string }
	| { op: 'replaceRange'; anchor: string; text: string }
	| { op: 'replaceFencedBlock'; tag: string; text: string }
;

const knownOps = new Set<EditOp['op']>([
	'replaceSelection', 'insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'replaceFencedBlock',
]);

export interface NoteContext {
	title: string;
	body: string;
	selection: string | null;
}

export interface ChatReply {
	reply: string;
	edits: EditOp[];
}

// ~250 tokens, always on. Without this the model defaults to plain CommonMark
// and invents syntax for Joplin extras (whiteboards, note links) that don't
// render.
const joplinMarkdownNotes = [
	'This note uses Joplin Markdown — CommonMark plus the following extras:',
	'- Checkboxes: `- [ ] todo` and `- [x] done`. Render as interactive checkboxes.',
	'- Internal note links: `[Title](:/NOTE_ID)`. Never invent NOTE_IDs — only reuse ones already in the note.',
	'- Resource references (images, attachments): `![alt](:/RESOURCE_ID)` or `[name](:/RESOURCE_ID)`. Never invent RESOURCE_IDs. If the user wants a new image, describe it in plain text instead.',
	'- Math: `$inline$` and `$$block$$` (KaTeX). Chemistry via mhchem inside the same delimiters.',
	'- Mermaid diagrams: ```` ```mermaid ```` fenced blocks.',
	'- ABC musical notation: ```` ```abc ```` fenced blocks.',
	'- Fountain screenplays: ```` ```fountain ```` fenced blocks.',
	'- Whiteboards (canvas): ```` ```jsoncanvas ```` fenced blocks containing JSONCanvas 1.0 — the open spec at jsoncanvas.org. Use this when the user asks for a whiteboard, canvas, mind map, sticky notes, or similar spatial layout. A note that already contains a `jsoncanvas` block is a whiteboard; modifying its prose without preserving the block will break the whiteboard.',
	'- HTML is allowed for features without a Markdown equivalent (e.g. `<s>strikethrough</s>`).',
].join('\n');

const hasStructuredBlock = (note: NoteContext) => {
	return supportedStructuredBlockTags.some(tag => !!findFencedBlock(note.body, tag, 0));
};

// The system prompt should be relatively constant across note changes to take advantage of prompt caching.
// See https://developers.openai.com/api/docs/guides/prompt-caching
const systemPrompt = (note: NoteContext) => {
	const lines: string[] = [
		'You are an assistant helping the user work on a note in Joplin, a note-taking application.',
		'',
		`Note title: ${note.title || '(untitled)'}`,
		'',
		joplinMarkdownNotes,
		'',
	];

	if (note.selection) {
		lines.push('The user has selected the following text within the note. Scope your work to this selection.');
		lines.push('--- BEGIN SELECTION ---');
		lines.push(note.selection);
		lines.push('--- END SELECTION ---');
		lines.push();
	}

	if (note.selection) {
		lines.push('The selection is the only part of the note you can modify in this turn.');
	} else {
		lines.push(
			'Tool guidance:',
			'- You have access to various tools that allow updating the note. For example, if you need to add the text "test" to the end of the note, do this using the "appendToNote" tool.',
			'- Some tools call for anchors. Anchors must be exact substrings of the current note body. Keep them short but unique.',
		);
	}

	lines.push('Preserve the user\'s existing formatting conventions, including any Joplin-specific blocks already in the note.');

	return lines.join('\n');
};

const toolDefinitions = (note: NoteContext) => {
	const result: ToolSpec[] = [];

	if (note.selection) {
		result.push({
			name: 'replaceSelection',
			description: 'Replaces the text currently selected by the user.',
			inputSchema: {
				type: 'object',
				properties: {
					text: { type: 'string' },
				},
				required: ['text'],
				additionalProperties: false,
			},
		});
	} else {
		result.push(
			{
				name: 'readNote',
				description: 'Get the current, up-to-date content of the note.',
				inputSchema: {
					type: 'object',
					required: [],
					additionalProperties: false,
				},
			},
		);

		result.push(
			{
				name: 'appendToNote',
				description: 'Adds text to the end of the note. Text is always added to the end of the note. This tool does not require an anchor.',
				inputSchema: {
					type: 'object',
					properties: {
						text: { type: 'string' },
					},
					required: ['text'],
					additionalProperties: false,
				},
			},
		);

		const anchoredSchema = (anchorDescription: string, textDescription: string) => ({
			type: 'object',
			properties: {
				anchor: { type: 'string', description: anchorDescription },
				text: { type: 'string', description: textDescription },
			},
			required: ['anchor', 'text'],
			additionalProperties: false,
		});
		result.push(
			{
				name: 'insertBefore',
				description: 'Insert text immediately before the first occurrence of `anchor`.',
				inputSchema: anchoredSchema(
					'Text to find',
					'What to insert just **before** the found text',
				),
			},
			{
				name: 'insertAfter',
				description: 'Insert text immediately after the first occurrence of `anchor`.',
				inputSchema: anchoredSchema(
					'Text to find',
					'What to insert just **after** the found text',
				),
			},
			{
				name: 'replaceRange',
				description: 'Replace the first occurrence of `anchor` with `text`.',
				inputSchema: anchoredSchema(
					'The text to replace',
					'What to replace it with',
				),
			},
		);

		const hasFencedBlock = hasStructuredBlock(note);
		if (hasFencedBlock) {
			result.push({
				name: 'replaceFencedBlock',
				description: [
					'Replaces the inner content of the first ```<tag>``` fenced block.',
					`"text" is the new content inside the fence (no fence markers). Supported tags: ${supportedStructuredBlockTags.join(', ')}.`,
					'Use appendToNote to create a new fenced block.',
				].join(' '),
				inputSchema: {
					type: 'object',
					properties: {
						tag: {
							type: 'string',
							enum: supportedStructuredBlockTags,
						},
						text: {
							type: 'string',
							description: 'The new content for the block content. Should not include the fenced block delimiters.',
						},
					},
					required: ['tag', 'text'],
					additionalProperties: false,
				},
			});
		}

	}

	return result;
};

const createHistory = (history: ChatMessage[], newMessage: string, context: NoteContext): ChatMessage[] => {
	history = removeSystemPrompt(history);

	const isNewChat = history.length === 0 && !context.selection;
	history = [
		{ role: ChatRole.System, content: systemPrompt(context) },
		...history,
		{ role: ChatRole.User, content: newMessage },
	];

	// The assistant almost always needs to fetch the current content of the note. Initializing the
	// chat transcript with a `readNote` tool call saves one round-trip:
	const addReadNote = isNewChat;
	if (addReadNote) {
		const callId = `call_read${history.length}`;
		history.push(
			{
				role: ChatRole.Assistant,
				content: '',
				hide: true,
				toolCalls: [
					{ callId, arguments: { }, toolName: 'readNote', parseError: null },
				],
			},
			{
				role: ChatRole.Tool,
				content: context.body,
				toolCallId: callId,
				toolName: 'readNote',
				userDescription: '',
				isEdit: false,
				isError: false,
			},
		);
	}

	return history;
};

const estimateTokens = (text: string) => Math.ceil(text.length / charsPerToken);

export interface ChatCommands {
	replaceSelection: (text: string, originalText: string)=> Promise<void>;
	updateNoteBody: (body: string, originalBody: string)=> Promise<void>;
	displayError: (message: string)=> void;
}

type OnContext = ()=> Promise<NoteContext>;
type OnHistoryChanged = (history: ChatMessage[])=> void;

export const runNoteChat = async (
	context: OnContext,
	history: ChatMessage[],
	userMessage: string,
	commands: ChatCommands,
	onHistoryChanged: OnHistoryChanged,
	signal: AbortSignal,
) => {
	const initialContext = await context();
	history = createHistory(history, userMessage, initialContext);
	onHistoryChanged([...history]);

	const hasUndeliveredToolResults = () => history[history.length - 1]?.role === ChatRole.Tool;
	let runsWithFailedTools = 0;
	do {
		// If the model fails to successfully use tools more than 4 times in a row, disallow tool use
		// to avoid an infinite loop:
		const allowTools = runsWithFailedTools < 5;
		const { messages, failedToolCount } = await stepNoteChat({
			context,
			messages: history,
			commands,
			onHistoryChanged,
			signal,
			allowTools,
		});

		history = messages;
		if (failedToolCount > 0) {
			runsWithFailedTools ++;
		} else {
			runsWithFailedTools = 0;
		}
	}
	while (!signal.aborted && hasUndeliveredToolResults());

	return history;
};

interface StepNoteChatOptions {
	context: OnContext;
	messages: ChatMessage[];
	commands: ChatCommands;
	onHistoryChanged: OnHistoryChanged;
	signal: AbortSignal;
	allowTools: boolean;
}

const stepNoteChat = async ({
	context, messages, commands, onHistoryChanged, signal, allowTools,
}: StepNoteChatOptions) => {
	const note = await context();

	assertWithinTokenBudget(messages, noteBodyTokenBudget);
	const chatResult = await AiService.instance().chat(
		messages, { tools: allowTools ? toolDefinitions(note) : [], signal },
	);

	// Chat results can contain sensitive information -- only log in dev mode
	logger.debug('Received chat result', chatResult);
	messages.push({
		role: ChatRole.Assistant,
		content: chatResult.text ?? '',
		toolCalls: allowTools ? chatResult.toolCalls : [],
	});
	onHistoryChanged([...messages]);

	let failedToolCount = 0;
	if (allowTools) {
		const toolResults = await runTools(chatResult, note, context, commands, signal);
		messages.push(...toolResults);
		onHistoryChanged([...messages]);

		failedToolCount = toolResults.filter(t => t.isError).length;
	}

	return { messages, failedToolCount };
};

const removeSystemPrompt = (history: ChatMessage[]) => {
	return history.filter(message => message.role !== 'system');
};

const assertWithinTokenBudget = (history: ChatMessage[], budget: number) => {
	const estimateToolCallTokens = (toolCalls: ChatToolCall[]) => {
		let sum = 0;
		for (const toolCall of toolCalls) {
			sum += estimateTokens(JSON.stringify(toolCall.arguments));
		}
		return sum;
	};

	// Budget the full payload — sticky history grows turn-by-turn and would
	// eventually blow the context window even if no single note is too big.
	let totalTokens = 0;
	for (const message of history) {
		totalTokens += estimateTokens(message.content);
		if (message.role === ChatRole.Assistant) {
			totalTokens += estimateToolCallTokens(message.toolCalls ?? []);
		}
		if (message.role === ChatRole.Tool) {
			totalTokens += estimateTokens(message.content);
		}
	}

	if (totalTokens > budget) {
		throw new JoplinError(
			'This conversation has grown too large to send. Reset the chat, or select the part of the note you want to ask about.',
			'aiNoteTooLarge',
		);
	}
};

const assertNotCancelled = (signal: AbortSignal) => {
	if (signal.aborted) {
		throw new JoplinError(
			'Cancelled.',
			'aiChatCancelled',
		);
	}
};

const runTools = async (chat: ChatResult, initialContext: NoteContext, context: OnContext, commands: ChatCommands, signal: AbortSignal) => {
	assertNotCancelled(signal);

	let chatResponses: ChatToolMessage[] = [];

	const isEdit = (toolName: string) => isValidEditOp(toolName);

	const respondSuccess = (action: ChatToolCall, message: string, userDescription?: string) => {
		chatResponses.push({
			role: ChatRole.Tool,
			toolName: action.toolName,
			toolCallId: action.callId,
			content: message,
			userDescription: userDescription ?? message,
			isError: false,
			isEdit: isEdit(action.toolName),
		});
	};

	const respondFailure = (action: ChatToolCall, reason: string) => {
		chatResponses.push({
			role: ChatRole.Tool,
			toolName: action.toolName,
			toolCallId: action.callId,
			content: `failed: ${reason}`,
			userDescription: reason,
			isError: true,
			isEdit: isEdit(action.toolName),
		});
	};

	// Only replaceSelection operations allowed when there's a selection
	const currentContext = await context();
	if (currentContext.selection) {
		const expectedName = 'replaceSelection';
		const action = chat.toolCalls.find(toolCall => toolCall.toolName === expectedName);
		if (action) {
			const args = action.arguments;
			if (action.parseError) {
				respondFailure(action, action.parseError);
			} else if (!hasOwnProperty(args, 'text') || typeof args.text !== 'string') {
				respondFailure(action, 'missing or invalid `text` property');
			} else {
				try {
					await commands.replaceSelection(args.text, currentContext.selection);
					respondSuccess(action, describeEditOperation(toolCallToEditOperation(action)));
				} catch (error) {
					logger.error('Failed to replace selection', error);
					respondFailure(action, 'failed to replace selection');
					commands.displayError(error.message ?? String(error));
				}
			}
		}

		// Only one tool call is allowed in this context
		for (const toolCall of chat.toolCalls) {
			if (action === toolCall) continue;
			if (toolCall.toolName === expectedName) {
				respondFailure(toolCall, `Only a single ${expectedName} tool call is valid in this context`);
			} else {
				respondFailure(toolCall, `Only the ${expectedName} tool is valid in this context.`);
			}
		}
	} else {
		const initialBody = initialContext.body;
		let body = currentContext.body;
		const hadExternalBodyChanges = initialBody !== body;
		let attemptedEdit = false;

		for (const toolCall of chat.toolCalls) {
			if (toolCall.toolName === 'replaceSelection') {
				respondFailure(toolCall, 'replaceSelection is invalid in this context');
			} else if (toolCall.parseError) {
				respondFailure(toolCall, toolCall.parseError);
			} else if (toolCall.toolName === 'readNote') {
				respondSuccess(toolCall, body, _('Read note'));
			} else if (!isValidEditOp(toolCall.toolName)) {
				respondFailure(toolCall, 'tool not found');
			} else if (hadExternalBodyChanges) {
				attemptedEdit = true;
				respondFailure(toolCall, 'body changed externally, before edit could be applied');
			} else {
				attemptedEdit = true;
				const editOperation = toolCallToEditOperation(toolCall);
				const { newBody, appliedEdits } = applyAnchorEdits(body, [editOperation], 0);
				body = newBody;

				if (appliedEdits.length !== 1) {
					throw new Error(`Invalid state: Wrong number of applied edits, ${appliedEdits.length}`);
				}

				const edit = appliedEdits[0];
				if (edit.status === 'applied') {
					respondSuccess(toolCall, describeEditOperation(editOperation));
				} else {
					respondFailure(toolCall, edit.status);
				}
			}
		}

		if (attemptedEdit && hadExternalBodyChanges) {
			commands.displayError(_('The note changed while the request was running; edits were not applied. Try again.'));
		}
		// Avoid overwriting user-created changes
		if (!hadExternalBodyChanges && body !== initialBody) {
			try {
				await commands.updateNoteBody(body, initialBody);
			} catch (error) {
				logger.error('Failed to update body', error);

				// Replace any 'success' messages with failures, since all tools
				// currently depend on updating the body.
				chatResponses = [];
				for (const toolCall of chat.toolCalls) {
					respondFailure(toolCall, 'failed to update body');
				}

				commands.displayError(error.message ?? String(error));
			}
		}
	}

	return chatResponses;
};

const isValidEditOp = (operation: string): operation is EditOp['op'] => {
	return knownOps.has(operation as EditOp['op']);
};

const toolCallToEditOperation = (toolCall: ChatToolCall): EditOp => {
	const op = toolCall.toolName;
	if (!isValidEditOp(op)) {
		throw new Error(`Invalid edit operation: ${op}`);
	}

	const args = toolCall.arguments;
	return {
		op,
		...('text' in args && typeof args.text === 'string' ? { text: args.text } : {}),
		...('anchor' in args && typeof args.anchor === 'string' ? { anchor: args.anchor } : {}),
		...('tag' in args && typeof args.tag === 'string' ? { tag: args.tag } : {}),
	} as EditOp;
};

const countWords = (text: string): number => Countable.countOnce(text, { stripTags: true }).words;

const describeEditOperation = (editOp: EditOp) => {
	const describeWordsAdded = (count: number) => _n('Added %d word', 'Added %d words', count, count);
	const describeWordsRemoved = (count: number) => _n('Removed %d word', 'Removed %d words', count, count);

	let actionDescription;
	if (editOp.op === 'replaceRange') {
		actionDescription = [
			describeWordsRemoved(countWords(editOp.anchor)),
			describeWordsAdded(countWords(editOp.text)),
		].join('\n');
	} else if (editOp.op === 'replaceFencedBlock') {
		actionDescription = _('Updated %s block', editOp.tag);
	} else if (editOp.op === 'replaceSelection') {
		actionDescription = _('Replaced selection');
	} else {
		actionDescription = describeWordsAdded(countWords(editOp.text));
	}
	return actionDescription;
};

// Exported for tests.
export const _internal = { systemPrompt, toolDefinitions, assertWithinTokenBudget, estimateTokens, runTools, noteBodyTokenBudget };
