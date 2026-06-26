import AiService from './AiService';
import { ChatMessage } from './types';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import JSON5 from 'json5';

const logger = Logger.create('noteChat');

// Conservative token budget for the user-controlled portion of the prompt
// (system message + history + user turn). Keeps headroom for the model reply.
// Notes whose body alone would exceed this are refused — v1 expects the user
// to select the relevant region instead.
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
		lines.push('The user has selected the following text within the note. Unless they ask otherwise, scope your work to this selection.');
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
	lines.push('Each edit must be one of:');
	lines.push('  { "op": "replaceSelection", "text": "..." } — replaces the currently selected text. Only valid when the user has a selection.');
	lines.push('  { "op": "insertBefore", "anchor": "...", "text": "..." } — inserts text immediately before the first occurrence of "anchor".');
	lines.push('  { "op": "insertAfter", "anchor": "...", "text": "..." } — inserts text immediately after the first occurrence of "anchor".');
	lines.push('  { "op": "appendToNote", "text": "..." } — appends text at the end of the note.');
	lines.push('  { "op": "replaceRange", "anchor": "...", "text": "..." } — replaces the first occurrence of "anchor" with "text".');
	lines.push('');
	lines.push('Anchors must be exact substrings of the current note body (or selection, for replaceSelection). Keep them short but unique.');
	lines.push('The note is Markdown. Preserve the user\'s formatting conventions.');

	return lines.join('\n');
};

const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

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
		const edits = Array.isArray(parsed.edits) ? parsed.edits as EditOp[] : [];
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
	const contextText = note.selection ?? note.body;
	if (estimateTokens(contextText) > NOTE_BODY_TOKEN_BUDGET) {
		throw new JoplinError(
			'This note is too large to send. Select the part you want to ask about, then try again.',
			'aiNoteTooLarge',
		);
	}

	const messages: ChatMessage[] = [
		{ role: 'system', content: systemPrompt(note) },
		...history.map<ChatMessage>(t => ({ role: t.role, content: t.content })),
		{ role: 'user', content: userMessage },
	];

	const result = await AiService.instance().chat(messages);
	return tryParseReply(result.text);
};

// Exported for tests.
export const _internal = { systemPrompt, tryParseReply, estimateTokens, NOTE_BODY_TOKEN_BUDGET };
