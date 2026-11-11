import { applyAnchorEdits } from './applyNoteEdits';

describe('applyNoteEdits', () => {
	it('appends with paragraph break (covered in detail below)', () => {
		const { newBody } = applyAnchorEdits('hello', [
			{ op: 'appendToNote', text: 'world' },
		], 0);
		expect(newBody).toBe('hello\n\nworld');
	});

	it('inserts before/after anchor', () => {
		const before = applyAnchorEdits('one two three', [
			{ op: 'insertBefore', anchor: 'two', text: 'X ' },
		], 0);
		expect(before.newBody).toBe('one X two three');

		const after = applyAnchorEdits('one two three', [
			{ op: 'insertAfter', anchor: 'two', text: ' X' },
		], 0);
		expect(after.newBody).toBe('one two X three');
	});

	it('replaces range and reports missing anchor', () => {
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

	it('picks anchor closest to cursor on duplicates', () => {
		// "foo" appears at index 0 and index 8. Cursor near second occurrence.
		const body = 'foo bar foo baz';
		const { newBody } = applyAnchorEdits(body, [
			{ op: 'insertAfter', anchor: 'foo', text: '!' },
		], 10);
		expect(newBody).toBe('foo bar foo! baz');
	});

	it('appends with blank line for Markdown paragraph break', () => {
		// Empty body — no separator needed.
		expect(applyAnchorEdits('', [{ op: 'appendToNote', text: 'first' }], 0).newBody).toBe('first');
		// No trailing newline — needs full \n\n.
		expect(applyAnchorEdits('hello', [{ op: 'appendToNote', text: 'world' }], 0).newBody).toBe('hello\n\nworld');
		// One trailing newline — add one more to make a blank line.
		expect(applyAnchorEdits('hello\n', [{ op: 'appendToNote', text: 'world' }], 0).newBody).toBe('hello\n\nworld');
		// Already has blank line — no extra separator.
		expect(applyAnchorEdits('hello\n\n', [{ op: 'appendToNote', text: 'world' }], 0).newBody).toBe('hello\n\nworld');
	});

	it('rejects invalid edits without mutating the body', () => {
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

	it('replaces the inner content of a fenced block', () => {
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

	it('picks the fenced block closest to the cursor', () => {
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

	it('reports anchor-not-found when fenced block missing', () => {
		const body = 'No whiteboard in this note.';
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'jsoncanvas', text: '{}' },
		], 0);
		expect(newBody).toBe(body);
		expect(appliedEdits[0].status).toBe('anchor-not-found');
	});

	it('rejects replaceFencedBlock with unsupported tag', () => {
		// Plain code fences (```js, ```python, ...) are not structured-document
		// formats — the model should use anchor-based ops instead.
		const body = '```js\nconsole.log("x");\n```';
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceFencedBlock', tag: 'js', text: 'console.log("y");' },
		], 0);
		expect(newBody).toBe(body);
		expect(appliedEdits[0].status).toBe('invalid');
	});

	it('refuses replaceRange anchor covering most of the body', () => {
		const body = 'short text';
		// Anchor is >50% of body — would be destructive; refuse.
		const { newBody, appliedEdits } = applyAnchorEdits(body, [
			{ op: 'replaceRange', anchor: 'short text', text: '' },
		], 0);
		expect(newBody).toBe(body);
		expect(appliedEdits[0].status).toBe('invalid');
	});
});
