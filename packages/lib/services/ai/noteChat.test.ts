import { _internal, NoteContext } from './noteChat';
import { applyAnchorEdits } from './applyNoteEdits';

const getEditOperationSchema = (note: NoteContext) => {
	const schema = _internal.responseSchema(note).json_schema.schema;
	return schema.properties.edits.items;
};

describe('noteChat', () => {

	test('systemPrompt includes selection when present and omits full body', () => {
		const prompt = _internal.systemPrompt({
			title: 'My note',
			body: 'long body text',
			selection: 'just this bit',
		});
		expect(prompt).toContain('My note');
		expect(prompt).toContain('just this bit');
		expect(prompt).toContain('BEGIN SELECTION');
		expect(prompt).not.toContain('long body text');
	});

	test('systemPrompt advertises Joplin-specific Markdown features', () => {
		const prompt = _internal.systemPrompt({ title: 'n', body: 'b', selection: null });
		// The fence tags are the load-bearing strings — the model knows the
		// syntax inside (JSONCanvas, Mermaid, KaTeX) but needs the Joplin
		// fence tag to wrap it correctly.
		expect(prompt).toContain('jsoncanvas');
		expect(prompt).toContain('mermaid');
		expect(prompt).toContain('KaTeX');
		// Don't-invent-IDs guidance for note + resource links.
		expect(prompt).toContain('Never invent NOTE_IDs');
		expect(prompt).toContain('Never invent RESOURCE_IDs');
		// Checkboxes (todos).
		expect(prompt).toContain('- [ ]');
	});

	test('systemPrompt includes full body when no selection', () => {
		const prompt = _internal.systemPrompt({
			title: 'My note',
			body: 'the whole body',
			selection: null,
		});
		expect(prompt).toContain('the whole body');
		expect(prompt).toContain('BEGIN NOTE');
	});

	test.each([
		true, false,
	])('responseSchema should require "op" and disallow additional properties (has selection: %b)', (selection) => {
		const schema = getEditOperationSchema({
			title: 'Note',
			body: 'some body',
			selection: selection ? 'body' : null,
		});

		const operations = [
			...(schema.type === 'object' ? [schema] : []),
			...(schema.anyOf ?? []),
		];

		for (const operation of operations) {
			expect(operation.required).toContain('op');
			expect(operation.additionalProperties).toBe(false);
		}
	});

	test.each([
		{
			label: 'restricts ops to replaceSelection when selection present',
			note: {
				title: 'My note',
				body: 'long body text',
				selection: 'just this bit',
			},
			expectedOperations: ['replaceSelection'],
		},
		{
			label: 'offers anchor operations when no selection present',
			note: {
				title: 'n',
				body: 'b',
				selection: null,
			},
			expectedOperations: ['insertBefore', 'insertAfter', 'appendToNote', 'replaceRange'],
		},
		{
			label: 'offers replaceFencedBlock when Mermaid block present',
			note: {
				title: 'n',
				body: '```mermaid\ngitGraph\n\tcommit\n```\n',
				selection: null,
			},
			expectedOperations: ['insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'replaceFencedBlock'],
		},
	])('responseSchema is consistent with systemPrompt (case $label)', ({ note, expectedOperations }) => {
		const allOperations = new Set([
			'insertBefore',
			'insertAfter',
			'appendToNote',
			'replaceRange',
			'replaceFencedBlock',
		]);
		const expectedMissingOperations = new Set(allOperations);
		for (const operation of expectedOperations) {
			expectedMissingOperations.delete(operation);
		}

		const prompt = _internal.systemPrompt(note);
		const editSchemaItems = getEditOperationSchema(note);

		const allowedSchemaOperations = [
			...(editSchemaItems.properties?.op?.enum ?? []),
			...(editSchemaItems.anyOf?.map(item => item.properties.op.enum)?.flat() ?? []),
		].sort();
		expect(allowedSchemaOperations).toEqual([...expectedOperations].sort());

		// Prompt's operations list should be correct
		for (const operation of expectedOperations) {
			expect(prompt).toContain(operation);
		}
		for (const operation of expectedMissingOperations) {
			expect(prompt).not.toContain(operation);
		}
	});

	test.each([
		['{"reply":"hi","edits":[]}', 'hi', 0],
		['```json\n{"reply":"hi","edits":[]}\n```', 'hi', 0],
		['{"reply":"done","edits":[{"op":"appendToNote","text":"x"}]}', 'done', 1],
		// JSON5 tolerances — trailing commas, single quotes, unquoted keys.
		// Models emit these despite instructions; the parser absorbs the drift.
		['{"reply":"done","edits":[{"op":"appendToNote","text":"x"},]}', 'done', 1],
		['{"reply":"done","edits":[{"op":"appendToNote","text":"x",}]}', 'done', 1],
		['{reply:"done",edits:[{op:"appendToNote",text:"x"}]}', 'done', 1],
		['{\'reply\':\'done\',\'edits\':[]}', 'done', 0],
		['not json at all', 'not json at all', 0],
	])('tryParseReply parses %s', (input, expectedReply, expectedEditCount) => {
		const parsed = _internal.tryParseReply(input);
		expect(parsed.reply).toBe(expectedReply);
		expect(parsed.edits.length).toBe(expectedEditCount);
	});

	test('estimateTokens approximates char/4', () => {
		expect(_internal.estimateTokens('')).toBe(0);
		expect(_internal.estimateTokens('a'.repeat(400))).toBe(100);
	});

	test('applyAnchorEdits appends with paragraph break (covered in detail below)', () => {
		const { newBody } = applyAnchorEdits('hello', [
			{ op: 'appendToNote', text: 'world' },
		], 0);
		expect(newBody).toBe('hello\n\nworld');
	});

	test('applyAnchorEdits inserts before/after anchor', () => {
		const before = applyAnchorEdits('one two three', [
			{ op: 'insertBefore', anchor: 'two', text: 'X ' },
		], 0);
		expect(before.newBody).toBe('one X two three');

		const after = applyAnchorEdits('one two three', [
			{ op: 'insertAfter', anchor: 'two', text: ' X' },
		], 0);
		expect(after.newBody).toBe('one two X three');
	});

	test('applyAnchorEdits replaces range and reports missing anchor', () => {
		const replaced = applyAnchorEdits('alpha beta gamma', [
			{ op: 'replaceRange', anchor: 'beta', text: 'BETA' },
		], 0);
		expect(replaced.newBody).toBe('alpha BETA gamma');

		const missing = applyAnchorEdits('alpha beta gamma', [
			{ op: 'replaceRange', anchor: 'delta', text: 'X' },
		], 0);
		expect(missing.newBody).toBe('alpha beta gamma');
		expect(missing.appliedEdits[0].status).toBe('anchor-not-found');
	});

	test('applyAnchorEdits picks anchor closest to cursor on duplicates', () => {
		// "foo" appears at index 0 and index 8. Cursor near second occurrence.
		const body = 'foo bar foo baz';
		const { newBody } = applyAnchorEdits(body, [
			{ op: 'insertAfter', anchor: 'foo', text: '!' },
		], 10);
		expect(newBody).toBe('foo bar foo! baz');
	});

	test('applyAnchorEdits appends with blank line for Markdown paragraph break', () => {
		// Empty body — no separator needed.
		expect(applyAnchorEdits('', [{ op: 'appendToNote', text: 'first' }], 0).newBody).toBe('first');
		// No trailing newline — needs full \n\n.
		expect(applyAnchorEdits('hello', [{ op: 'appendToNote', text: 'world' }], 0).newBody).toBe('hello\n\nworld');
		// One trailing newline — add one more to make a blank line.
		expect(applyAnchorEdits('hello\n', [{ op: 'appendToNote', text: 'world' }], 0).newBody).toBe('hello\n\nworld');
		// Already has blank line — no extra separator.
		expect(applyAnchorEdits('hello\n\n', [{ op: 'appendToNote', text: 'world' }], 0).newBody).toBe('hello\n\nworld');
	});

	test('applyAnchorEdits rejects invalid edits without mutating the body', () => {
		// Empty anchor, missing text, wrong shape, unknown op.
		const body = 'hello world';
		const cases = [
			{ op: 'insertBefore', anchor: '', text: 'X' },
			{ op: 'insertAfter', anchor: 'world' }, // missing text
			{ op: 'appendToNote' }, // missing text
			{ op: 'mysteryOp', text: 'X' },
		];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = applyAnchorEdits(body, cases as any, 0);
		expect(result.newBody).toBe(body);
		expect(result.appliedEdits.every(e => e.status === 'invalid')).toBe(true);
	});

	test('applyAnchorEdits replaces the inner content of a fenced block', () => {
		const body = 'Intro paragraph.\n\n```jsoncanvas\n{"nodes":[],"edges":[]}\n```\n\nOutro.';
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'jsoncanvas', text: '{"nodes":[{"id":"a"}],"edges":[]}' },
		], 0);
		expect(appliedEdits[0].status).toBe('applied');
		expect(newBody).toContain('```jsoncanvas\n{"nodes":[{"id":"a"}],"edges":[]}\n```');
		// Surrounding prose is preserved.
		expect(newBody).toContain('Intro paragraph.');
		expect(newBody).toContain('Outro.');
	});

	test('applyAnchorEdits picks the fenced block closest to the cursor', () => {
		const first = '```jsoncanvas\n{"v":1}\n```';
		const second = '```jsoncanvas\n{"v":2}\n```';
		const body = `${first}\n\nSome prose between.\n\n${second}`;
		// Cursor near the second block — should edit that one, leaving the first untouched.
		const cursorNearSecond = body.indexOf(second) + 5;
		const { newBody } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'jsoncanvas', text: '{"v":99}' },
		], cursorNearSecond);
		expect(newBody).toContain('{"v":1}'); // first untouched
		expect(newBody).toContain('{"v":99}'); // second replaced
		expect(newBody).not.toContain('{"v":2}');

		// Cursor at 0 — first block wins (fallback behaviour preserved).
		const { newBody: firstWins } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'jsoncanvas', text: '{"v":0}' },
		], 0);
		expect(firstWins).toContain('{"v":0}');
		expect(firstWins).toContain('{"v":2}'); // second untouched
		expect(firstWins).not.toContain('{"v":1}');
	});

	test('applyAnchorEdits reports anchor-not-found when fenced block missing', () => {
		const body = 'No whiteboard in this note.';
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'jsoncanvas', text: '{}' },
		], 0);
		expect(newBody).toBe(body);
		expect(appliedEdits[0].status).toBe('anchor-not-found');
	});

	test('applyAnchorEdits rejects replaceFencedBlock with unsupported tag', () => {
		// Plain code fences (```js, ```python, ...) are not structured-document
		// formats — the model should use anchor-based ops instead.
		const body = '```js\nconsole.log("x");\n```';
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'js', text: 'console.log("y");' },
		], 0);
		expect(newBody).toBe(body);
		expect(appliedEdits[0].status).toBe('invalid');
	});

	test('systemPrompt advertises replaceFencedBlock with structured-block guidance', () => {
		const prompt = _internal.systemPrompt({ title: 'n', body: '```abc\n```', selection: null });
		expect(prompt).toContain('replaceFencedBlock');
		expect(prompt).toContain('jsoncanvas');
		// Guidance to use the op for structured blocks, appendToNote for creation.
		expect(prompt).toContain('replaceFencedBlock with the full new content');
		expect(prompt).toContain('use appendToNote');
	});

	test('applyAnchorEdits refuses replaceRange anchor covering most of the body', () => {
		const body = 'short text';
		// Anchor is >50% of body — would be destructive; refuse.
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceRange', anchor: 'short text', text: '' },
		], 0);
		expect(newBody).toBe(body);
		expect(appliedEdits[0].status).toBe('invalid');
	});

	test('tryParseReply ignores primitive top-level values', () => {
		// Bare string parses as JSON5 but isn't a reply envelope.
		expect(_internal.tryParseReply('"hello"').reply).toBe('"hello"');
		expect(_internal.tryParseReply('"hello"').edits.length).toBe(0);
		expect(_internal.tryParseReply('null').reply).toBe('null');
		expect(_internal.tryParseReply('[1,2,3]').reply).toBe('[1,2,3]');
	});

	test('enforceSelectionScope strips anchor ops when selection present, passes through otherwise', () => {
		const reply = {
			reply: 'ok',
			edits: [
				{ op: 'replaceSelection' as const, text: 'A' },
				{ op: 'appendToNote' as const, text: 'B' },
				{ op: 'insertBefore' as const, anchor: 'x', text: 'C' },
				{ op: 'replaceRange' as const, anchor: 'y', text: 'D' },
			],
		};
		// With selection: only replaceSelection survives.
		const scoped = _internal.enforceSelectionScope(reply, 'some selection');
		expect(scoped.edits.length).toBe(1);
		expect(scoped.edits[0].op).toBe('replaceSelection');
		// Without selection: everything passes through unchanged.
		const unscoped = _internal.enforceSelectionScope(reply, null);
		expect(unscoped.edits.length).toBe(4);
	});

	test('tryParseReply drops malformed edits but keeps valid ones', () => {
		// Mixed array: missing op, unknown op, primitive, and one valid entry.
		const text = '{"reply":"ok","edits":["lol",{"op":"bogus"},{"op":"appendToNote","text":"good"},{}]}';
		const parsed = _internal.tryParseReply(text);
		expect(parsed.reply).toBe('ok');
		expect(parsed.edits.length).toBe(1);
		expect(parsed.edits[0].op).toBe('appendToNote');
	});

});
