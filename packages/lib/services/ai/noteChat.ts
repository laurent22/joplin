import AiService from './AiService';
import { ChatMessage } from './types';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import JSON5 from 'json5';

const logger = Logger.create('noteChat');

// Conservative token budget for the user-controlled portion of the prompt
// (system message + history + user turn). Keeps headroom for the model reply.
// Payloads that exceed this are refused — v1 expects the user to select the
// relevant region or trim the conversation instead.
const NOTE_BODY_TOKEN_BUDGET = 80000;

// Rough char→token ratio. Good enough for a budget check; we don't need
// per-provider tokenisers here.
const CHARS_PER_TOKEN = 4;

export type EditOp =
	| { op: 'replaceSelection'; text: string }
	| { op: 'insertBefore'; anchor: string; text: string }
	| { op: 'insertAfter'; anchor: string; text: string }
	| { op: 'appendToNote'; text: string }
	| { op: 'replaceRange'; anchor: string; text: string };

const KNOWN_OPS = new Set<EditOp['op']>([
	'replaceSelection', 'insertBefore', 'insertAfter', 'appendToNote', 'replaceRange',
]);

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

const systemPrompt = (note: NoteContext) => {
	const lines: string[] = [
		'You are an assistant helping the user work on a note in Joplin, a note-taking application.',
		'',
		`Note title: ${note.title || '(untitled)'}`,
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
		// With a selection, only replaceSelection is offered. Anchor-based ops
		// target the full note body, which the model can't see in this mode —
		// advertising them would invite hallucinated anchors that mutate text
		// outside the user's selection.
		lines.push('Each edit must be:');
		lines.push('  { "op": "replaceSelection", "text": "..." } — replaces the selected text with "text".');
		lines.push('');
		lines.push('Do not use any other operation. The selection is the only part of the note you can modify in this turn.');
	} else {
		lines.push('Each edit must be one of:');
		lines.push('  { "op": "insertBefore", "anchor": "...", "text": "..." } — inserts text immediately before the first occurrence of "anchor".');
		lines.push('  { "op": "insertAfter", "anchor": "...", "text": "..." } — inserts text immediately after the first occurrence of "anchor".');
		lines.push('  { "op": "appendToNote", "text": "..." } — appends text at the end of the note.');
		lines.push('  { "op": "replaceRange", "anchor": "...", "text": "..." } — replaces the first occurrence of "anchor" with "text".');
		lines.push('');
		lines.push('Anchors must be exact substrings of the current note body. Keep them short but unique.');
	}

	lines.push('The note is Markdown. Preserve the user\'s formatting conventions.');

	return lines.join('\n');
};

const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

// Drops anything that doesn't at least have a known `op` string. Per-op
// field validation (anchor/text presence, anchor size) lives in
// applyNoteEdits — this is just the first filter so obvious junk doesn't
// reach the panel or the applier.
const sanitizeEdits = (raw: unknown): EditOp[] => {
	if (!Array.isArray(raw)) return [];
	const out: EditOp[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const op = (item as { op?: unknown }).op;
		if (typeof op !== 'string' || !KNOWN_OPS.has(op as EditOp['op'])) continue;
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

	// JSON5 accepts every strict-JSON document and additionally tolerates
	// the things models commonly emit despite instructions: trailing commas,
	// unquoted keys, single-quoted strings, comments. Models are inconsistent
	// about strict JSON output; this is the cheapest way to absorb the drift.
	try {
		const parsed = JSON5.parse(stripped);
		// Guard against non-object payloads (string, number, null). A model
		// that just returns "hello" parses successfully but isn't a reply
		// envelope — fall back to raw text in that case.
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

// Builds the message array and dispatches to AiService. Kept thin so a future
// streaming or agentic variant can sit alongside it without reshaping callers.
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

	// Budget the full assembled payload, not just the note text. Sticky
	// conversations grow turn-by-turn — eventually history (not the note)
	// would blow the context window, and a note-only check wouldn't catch it.
	const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
	if (totalTokens > NOTE_BODY_TOKEN_BUDGET) {
		throw new JoplinError(
			'This conversation has grown too large to send. Reset the chat, or select the part of the note you want to ask about.',
			'aiNoteTooLarge',
		);
	}

	const result = await AiService.instance().chat(messages);
	return tryParseReply(result.text);
};

// Exported for tests.
export const _internal = { systemPrompt, tryParseReply, estimateTokens, sanitizeEdits, NOTE_BODY_TOKEN_BUDGET };
