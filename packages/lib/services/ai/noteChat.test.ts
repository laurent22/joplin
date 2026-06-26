import { _internal } from './noteChat';
import { applyAnchorEdits } from './applyNoteEdits';

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

	test('systemPrompt restricts ops to replaceSelection when selection present', () => {
		const prompt = _internal.systemPrompt({
			title: 'n',
			body: 'b',
			selection: 'sel',
		});
		expect(prompt).toContain('replaceSelection');
		expect(prompt).not.toContain('insertBefore');
		expect(prompt).not.toContain('insertAfter');
		expect(prompt).not.toContain('appendToNote');
		expect(prompt).not.toContain('replaceRange');
	});

	test('systemPrompt offers anchor ops when no selection', () => {
		const prompt = _internal.systemPrompt({
			title: 'n',
			body: 'b',
			selection: null,
		});
		expect(prompt).toContain('insertBefore');
		expect(prompt).toContain('insertAfter');
		expect(prompt).toContain('appendToNote');
		expect(prompt).toContain('replaceRange');
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

	test('tryParseReply drops malformed edits but keeps valid ones', () => {
		// Mixed array: missing op, unknown op, primitive, and one valid entry.
		const text = '{"reply":"ok","edits":["lol",{"op":"bogus"},{"op":"appendToNote","text":"good"},{}]}';
		const parsed = _internal.tryParseReply(text);
		expect(parsed.reply).toBe('ok');
		expect(parsed.edits.length).toBe(1);
		expect(parsed.edits[0].op).toBe('appendToNote');
	});

});
