import AiService from './AiService';
import { ChatMessage, ToolSpec } from './types';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import JSON5 from 'json5';
import findFencedBlock from './utils/findFencedBlock';

const logger = Logger.create('noteChat');

// Budget for system + history + user turn. Leaves headroom for the reply.
// Oversize payloads are refused rather than truncated — see runNoteChat.
const noteBodyTokenBudget = 80000;

const charsPerToken = 4;

type BaseEditOp = { toolCallId: string };

export type EditOp = BaseEditOp & (
	| { op: 'replaceSelection'; text: string }
	| { op: 'insertBefore'; anchor: string; text: string }
	| { op: 'insertAfter'; anchor: string; text: string }
	| { op: 'appendToNote'; text: string }
	| { op: 'replaceRange'; anchor: string; text: string }
	| { op: 'replaceFencedBlock'; tag: string; text: string }
);

const knownOps = new Set<EditOp['op']>([
	'replaceSelection', 'insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'replaceFencedBlock',
]);

// Structured-document fences where the model regenerates the whole block —
// plain code fences (```js, ```python) are deliberately excluded.
export const supportedStructuredBlockTags = ['jsoncanvas', 'mermaid', 'abc', 'fountain'];

export interface ChatTurn {
	role: 'user' | 'assistant' | 'tool';
	toolCallId?: string;
	toolName?: string;
	content: string;
}

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
	} else {
		lines.push('Note body:');
		lines.push('--- BEGIN NOTE ---');
		lines.push(note.body);
		lines.push('--- END NOTE ---');
	}

	if (note.selection) {
		lines.push('The selection is the only part of the note you can modify in this turn.');
	} else {
		lines.push('When using tools: Anchors must be exact substrings of the current note body. Keep them short but unique.');
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
		const hasFencedBlock = hasStructuredBlock(note);
		const anchoredSchema = {
			type: 'object',
			properties: {
				anchor: { type: 'string' },
				text: { type: 'string' },
			},
			required: ['anchor', 'text'],
			additionalProperties: false,
		};
		result.push(
			{
				name: 'insertBefore',
				description: 'Inserts text immediately before the first occurrence of "anchor".',
				inputSchema: anchoredSchema,
			},
			{
				name: 'insertAfter',
				description: 'Inserts text immediately after the first occurrence of "anchor".',
				inputSchema: anchoredSchema,
			},
			{
				name: 'replaceRange',
				description: 'Replaces the first occurrence of "anchor" with "text".',
				inputSchema: anchoredSchema,
			},
			{
				name: 'appendToNote',
				description: 'Appends text at the end of the note.',
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
						text: { type: 'string' },
					},
					required: ['tag', 'text'],
					additionalProperties: false,
				},
			});
		}

	}

	return result;
};

const estimateTokens = (text: string) => Math.ceil(text.length / charsPerToken);

// First-pass filter. Per-op field validation lives in applyNoteEdits.
const sanitizeEdits = (raw: unknown): EditOp[] => {
	if (!Array.isArray(raw)) return [];
	const out: EditOp[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const op = (item as { op?: unknown }).op;
		if (typeof op !== 'string' || !knownOps.has(op as EditOp['op'])) continue;
		out.push(item as EditOp);
	}
	return out;
};

const tryParseReply = (text: string): ChatReply => {
	const trimmed = text.trim();

	// Some models wrap JSON in ```json ... ``` fences despite instructions.
	const stripped = trimmed
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '')
		.trim();

	// JSON5 absorbs the trailing commas / unquoted keys / single quotes /
	// comments that models emit despite strict-JSON instructions.
	try {
		const parsed = JSON5.parse(stripped);
		// Primitives parse but aren't reply envelopes.
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { reply: text, edits: [] };
		}
		const reply = typeof parsed.reply === 'string' ? parsed.reply : '';
		const edits = sanitizeEdits(parsed.edits);
		return { reply, edits };
	} catch {
		logger.warn('Failed to parse structured reply; falling back to raw text. Raw:', text);
		return { reply: text, edits: [] };
	}
};

export const runNoteChat = async (
	note: NoteContext,
	history: ChatTurn[],
	userMessage: string,
): Promise<ChatReply> => {
	const messages: ChatMessage[] = [
		{ role: 'system', content: systemPrompt(note) },
		...history.map<ChatMessage>(t => ({ role: t.role, content: t.content, toolCallId: t.toolCallId, toolName: t.toolName })),
		{ role: 'user', content: userMessage },
	];

	// Budget the full payload — sticky history grows turn-by-turn and would
	// eventually blow the context window even if no single note is too big.
	const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
	if (totalTokens > noteBodyTokenBudget) {
		throw new JoplinError(
			'This conversation has grown too large to send. Reset the chat, or select the part of the note you want to ask about.',
			'aiNoteTooLarge',
		);
	}

	const result = await AiService.instance().chat(messages, { tools: toolDefinitions(note) });
	const reply: ChatReply = {
		reply: result.text,
		edits: result.toolCalls.map(toolCall => {
			const parsedArguments = JSON.parse(toolCall.arguments);
			return {
				op: toolCall.toolName,
				id: toolCall.callId,
				text: parsedArguments.text,
				anchor: parsedArguments.anchor,
				tag: parsedArguments.tag,

				toolCallId: toolCall.callId,
			} as EditOp;
		}),
	};
	return enforceSelectionScope(reply, note.selection);
};

// Defence-in-depth: the prompt already tells the model to only use
// replaceSelection in this mode, but a non-compliant reply could still slip
// anchor ops through and mutate text outside the selection.
const enforceSelectionScope = (reply: ChatReply, selection: string | null): ChatReply => {
	if (!selection) return reply;
	return { reply: reply.reply, edits: reply.edits.filter(e => e.op === 'replaceSelection') };
};

// Exported for tests.
export const _internal = { systemPrompt, toolDefinitions, tryParseReply, estimateTokens, sanitizeEdits, enforceSelectionScope, noteBodyTokenBudget };
