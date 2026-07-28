import AiService from './AiService';
import { ChatMessage, ChatResult, ChatRole, ChatToolCall, ChatToolMessage } from './types';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import { _ } from '../../locale';
import { EditOp, isEditorToolCall } from './tools/buildEditorTools';
import { NoteContext, ToolError } from './tools/types';
import ToolIndex from './tools/ToolIndex';

const logger = Logger.create('noteChat');

// Budget for system + history + user turn. Leaves headroom for the reply.
// Oversize payloads are refused rather than truncated — see runNoteChat.
const noteBodyTokenBudget = 80000;

const charsPerToken = 4;

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

// The system prompt should be relatively constant across note changes to take advantage of prompt caching.
// See https://developers.openai.com/api/docs/guides/prompt-caching
const systemPrompt = (note: NoteContext) => {
	const lines: string[] = [
		'You are an assistant helping the user work on a note in Joplin, a note-taking application.',
		'',
		`Note title: ${note.title || '(untitled)'}`,
		`Note ID: ${note.noteId}`,
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
			'- You have access to various tools that allow updating the note. For example, if you need to add the text "test" to the end of the note, do this using the "editor.appendToNote" tool.',
			'- For tasks modifying the current note, prefer "editor." tools to global tools.',
			'- Some tools call for anchors. Anchors must be exact substrings of the current note body. Keep them short but unique.',
		);
	}

	lines.push('Preserve the user\'s existing formatting conventions, including any Joplin-specific blocks already in the note.');

	return lines.join('\n');
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
					{ callId, arguments: { }, toolName: 'editor.readNoteBody', parseError: null },
				],
			},
			{
				role: ChatRole.Tool,
				content: context.body,
				toolCallId: callId,
				toolName: 'editor.readNoteBody',
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
	assertWithinTokenBudget(messages, noteBodyTokenBudget);
	const note = await context();

	const toolIndex = new ToolIndex({ note, commands });

	const chatResult = await AiService.instance().chat(messages, {
		tools: allowTools ? toolIndex.getTools() : [],
		signal,
	});

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
		const toolResults = await runTools(
			chatResult, note, context, commands, signal,
		);
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

const runTools = async (
	chat: ChatResult, initialContext: NoteContext, getContext: OnContext, commands: ChatCommands, signal: AbortSignal,
) => {
	assertNotCancelled(signal);

	const currentContext = await getContext();
	let chatResponses: ChatToolMessage[] = [];

	const isEdit = (toolName: string) => isEditorToolCall(toolName) && toolName !== 'editor.readNoteBody';

	const respondFailure = (action: ChatToolCall, reason: string, userDescription?: string) => {
		chatResponses.push({
			role: ChatRole.Tool,
			toolName: action.toolName,
			toolCallId: action.callId,
			content: `failed: ${reason}`,
			userDescription: userDescription ?? reason,
			isError: true,
			isEdit: isEdit(action.toolName),
		});
	};

	const runTool = async (toolCall: ChatToolCall, body: string) => {
		const index = new ToolIndex({
			note: { ...currentContext, body },
			commands: {
				...commands,
				updateNoteBody: newBody => {
					body = newBody;
					return Promise.resolve();
				},
			},
		});
		const toolId = toolCall.toolName;
		const tool = index.findTool(toolId);

		if (tool) {
			try {
				const output = await tool.handler(toolCall.arguments, { selectedFolderId: currentContext.folderId });

				chatResponses.push({
					role: ChatRole.Tool,
					toolName: tool.id,
					toolCallId: toolCall.callId,
					content: typeof output === 'string' ? output : JSON.stringify(output),
					userDescription: tool.userDescription(toolCall.arguments, output),
					isError: false,
					isEdit: isEdit(tool.id),
				});
			} catch (error) {
				logger.error('Tool call', toolCall.toolName, 'failed', error);
				if (error instanceof ToolError) {
					respondFailure(toolCall, error.message);
				} else {
					respondFailure(toolCall, 'failed');
				}
			}
		} else {
			respondFailure(
				toolCall,
				index.describeToolNotFoundFailure(toolId),
				_('Tool not found: %s', toolId),
			);
		}
		return body;
	};

	const initialBody = initialContext.body;
	let body = currentContext.body;
	const hadExternalBodyChanges = initialBody !== body;

	for (const toolCall of chat.toolCalls) {
		if (toolCall.parseError) {
			respondFailure(toolCall, toolCall.parseError);
		} else {
			body = await runTool(toolCall, body);
		}
	}

	const appliedEdits = chatResponses.filter(r => r.isEdit && !r.isError);
	if (appliedEdits.length > 0 && body !== initialBody) {
		try {
			// Avoid overwriting user-created changes
			if (hadExternalBodyChanges) {
				throw new Error(_('The note changed while the request was running; edits were not applied. Try again.'));
			}

			await commands.updateNoteBody(body, initialBody);
		} catch (error) {
			logger.error('Failed to update body', error);

			// All of the edit operations depend on updating the body, so they all
			// need to be marked as failures:
			const successfulEditResponses = new Set(appliedEdits);
			chatResponses = chatResponses.map(response => {
				if (!successfulEditResponses.has(response)) return response;
				return {
					...response,
					content: 'failed to update body',
					isError: true,
				};
			});

			commands.displayError(error.message ?? String(error));
		}
	}

	return chatResponses;
};


// Exported for tests.
export const _internal = { systemPrompt, assertWithinTokenBudget, estimateTokens, runTools, noteBodyTokenBudget };
