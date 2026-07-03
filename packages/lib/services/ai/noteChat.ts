import AiService from './AiService';
import { ChatMessage } from './types';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import JSON5 from 'json5';
import findFencedBlock from './utils/findFencedBlock';

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
	| { op: 'replaceFencedBlock'; tag: string; text: string };

const knownOps = new Set<EditOp['op']>([
	'replaceSelection', 'insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'replaceFencedBlock',
]);

// Structured-document fences where the model regenerates the whole block —
// plain code fences (```js, ```python) are deliberately excluded.
export const supportedStructuredBlockTags = ['jsoncanvas', 'mermaid', 'abc', 'fountain'];

export interface ChatTurn {
	role: 'user' | 'assistant';
	content: string;
	edits?: EditOp[];
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

	lines.push('');
	lines.push('Reply with a single JSON object and nothing else. The object must have this shape:');
	lines.push('{');
	lines.push('  "reply": "A short message to show the user in the chat.",');
	lines.push('  "edits": []');
	lines.push('}');
	lines.push('');
	lines.push('"edits" is an array of operations to apply to the note. Leave it empty for chat-only answers (e.g. questions about the note).');

	if (note.selection) {
		// Anchor ops would target text the model can't see in this mode,
		// inviting hallucinated anchors that mutate outside the selection.
		lines.push('Each edit must be:');
		lines.push('  { "op": "replaceSelection", "text": "..." } — replaces the selected text with "text".');
		lines.push('');
		lines.push('Do not use any other operation. The selection is the only part of the note you can modify in this turn.');
	} else {
		const hasFencedBlock = hasStructuredBlock(note);
		lines.push('Each edit must be one of:');
		lines.push('  { "op": "insertBefore", "anchor": "...", "text": "..." } — inserts text immediately before the first occurrence of "anchor".');
		lines.push('  { "op": "insertAfter", "anchor": "...", "text": "..." } — inserts text immediately after the first occurrence of "anchor".');
		lines.push('  { "op": "appendToNote", "text": "..." } — appends text at the end of the note.');
		lines.push('  { "op": "replaceRange", "anchor": "...", "text": "..." } — replaces the first occurrence of "anchor" with "text".');
		if (hasFencedBlock) {
			lines.push(`  { "op": "replaceFencedBlock", "tag": "...", "text": "..." } — replaces the inner content of the first \`\`\`<tag>\`\`\` fenced block. "text" is the new content inside the fence (no fence markers). Supported tags: ${supportedStructuredBlockTags.join(', ')}.`);
		}
		lines.push('');
		lines.push('Anchors must be exact substrings of the current note body. Keep them short but unique.');
		lines.push('');

		const addNewFencedBlockInstructions = 'use appendToNote with the complete fenced block including the ```<tag> markers';
		if (hasFencedBlock) {
			lines.push(`To edit a structured block already in the note (${supportedStructuredBlockTags.join(' / ')}), use replaceFencedBlock with the full new content — do not try to anchor inside the block's contents. To create one that doesn't exist yet, ${addNewFencedBlockInstructions}.`);
		} else {
			lines.push(`To add a structured block to the note (${supportedStructuredBlockTags.join(' / ')}), ${addNewFencedBlockInstructions}.`);
		}
	}

	lines.push('Preserve the user\'s existing formatting conventions, including any Joplin-specific blocks already in the note.');

	return lines.join('\n');
};

const responseSchema = (note: NoteContext) => {
	const editOperationSchema = note.selection ? {
		type: 'object',
		properties: {
			op: {
				type: 'string',
				enum: ['replaceSelection'],
			},
			text: { type: 'string' },
		},
		required: ['op', 'text'],
		additionalProperties: false,
	} : {
		anyOf: [
			{
				type: 'object',
				properties: {
					op: { type: 'string', enum: ['insertBefore', 'insertAfter', 'replaceRange'] },
					anchor: { type: 'string' },
					text: { type: 'string' },
				},
				required: ['op', 'anchor', 'text'],
				additionalProperties: false,
			},
			{
				type: 'object',
				properties: {
					op: { type: 'string', enum: ['appendToNote'] },
					text: { type: 'string' },
				},
				required: ['op', 'text'],
				additionalProperties: false,
			},
			...(hasStructuredBlock(note) ? [{
				type: 'object',
				properties: {
					op: { type: 'string', enum: ['replaceFencedBlock'] },
					tag: { type: 'string', enum: [...supportedStructuredBlockTags] },
					text: { type: 'string' },
				},
				required: ['op', 'tag', 'text'],
				additionalProperties: false,
			}] : []),
		],
	};

	const schema = {
		name: 'NoteChatResponse',
		strict: true,
		schema: {
			type: 'object',
			properties: {
				reply: { type: 'string' },
				edits: {
					type: 'array',
					items: editOperationSchema,
				},
			},
			required: ['reply', 'edits'],
			additionalProperties: false,
		},
	};

	return {
		type: 'json_schema' as const,
		json_schema: schema,
	};
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
		...history.map<ChatMessage>(t => ({ role: t.role, content: t.content })),
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

	const result = await AiService.instance().chat(messages, { responseFormat: responseSchema(note) });
	return enforceSelectionScope(tryParseReply(result.text), note.selection);
};

// Defence-in-depth: the prompt already tells the model to only use
// replaceSelection in this mode, but a non-compliant reply could still slip
// anchor ops through and mutate text outside the selection.
const enforceSelectionScope = (reply: ChatReply, selection: string | null): ChatReply => {
	if (!selection) return reply;
	return { reply: reply.reply, edits: reply.edits.filter(e => e.op === 'replaceSelection') };
};

// Exported for tests.
export const _internal = { systemPrompt, responseSchema, tryParseReply, estimateTokens, sanitizeEdits, enforceSelectionScope, noteBodyTokenBudget };
