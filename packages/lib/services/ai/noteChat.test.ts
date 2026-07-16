import { _internal, ChatCommands, NoteContext, runNoteChat } from './noteChat';
import { applyAnchorEdits } from './applyNoteEdits';
import { ChatRole, ChatToolCall } from './types';
import { expectThrow, setupDatabase, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';

const makeTestContext = () => {
	let body = 'Body';
	const initialContext: NoteContext = {
		title: 'Test',
		body,
		selection: null,
	};

	const commands: ChatCommands = {
		replaceSelection: jest.fn(),
		updateNoteBody: (newBody) => {
			body = newBody;
			return Promise.resolve();
		},
		displayError: jest.fn(),
	};

	return {
		onContext: () => Promise.resolve({ ...initialContext, body }),
		commands,
	};
};

describe('noteChat', () => {
	beforeAll(async () => {
		await setupDatabase(0);
		await switchClient(0);
		Setting.setValue('ai.chat.providerType', 'test-provider');
		Setting.setValue('ai.enabled', true);
	});

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
	])('toolDefinitions should include the expected operations (case $label)', ({ note, expectedOperations }) => {
		const editSchemaItems = _internal.toolDefinitions(note);

		const allowedSchemaOperations = editSchemaItems.map(item => item.name).sort();
		expect(allowedSchemaOperations).toEqual([...expectedOperations].sort());
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

	test('toolDefinitions advertises replaceFencedBlock with structured-block guidance', () => {
		const tools = _internal.toolDefinitions({ title: 'n', body: '```abc\n```', selection: null });
		const toolDefinition = tools.find(tool => tool.name === 'replaceFencedBlock');
		expect(toolDefinition).toBeTruthy();
		expect(toolDefinition.description).toContain('jsoncanvas');
		// Guidance to use the op for structured blocks, appendToNote for creation.
		expect(toolDefinition.description).toContain('"text" is the new content inside the fence (no fence markers)');
		expect(toolDefinition.description).toContain('Use appendToNote');
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

	test('assertWithinTokenBudget should include tool calls in the token budget', async () => {
		_internal.assertWithinTokenBudget([
			{ role: ChatRole.Assistant, content: 'Testing... '.repeat(5) },
		], 100);

		await expectThrow(async () => {
			_internal.assertWithinTokenBudget([
				{
					role: ChatRole.Assistant,
					content: 'Testing...'.repeat(5),
					toolCalls: [{
						toolName: 'replaceSelection',
						callId: 'call-1',
						arguments: { text: 'Testing... '.repeat(50) },
						parseError: null,
					}],
				},
			], 100);
		}, 'aiNoteTooLarge');
	});

	test('runTools should describe successful edit operations', async () => {
		const toolCalls: ChatToolCall[] = [
			{ toolName: 'appendToNote', callId: 'call-1', arguments: { text: 'Test.' }, parseError: null },
			{ toolName: 'replaceRange', callId: 'call-2', arguments: { anchor: 'Body', text: 'Updated' }, parseError: null },
		];

		const { onContext, commands } = makeTestContext();

		const result = await _internal.runTools(
			{ text: 'Test...', toolCalls, usage: { inputTokens: 10, outputTokens: 300 } },
			await onContext(),
			onContext,
			commands,
			new AbortController().signal,
		);

		expect((await onContext()).body).toBe('Updated\n\nTest.');
		expect(result).toMatchObject([
			{
				role: ChatRole.Tool,
				toolName: 'appendToNote',
				toolCallId: 'call-1',
				isError: false,
				userDescription: 'Added 1 word',
			},
			{
				role: ChatRole.Tool,
				toolName: 'replaceRange',
				toolCallId: 'call-2',
				isError: false,
				userDescription: 'Removed 1 word\nAdded 1 word',
			},
		]);
	});

	test('noteChat should stop retry loop if several responses in a row include tool failures', async () => {
		const { onContext, commands } = makeTestContext();
		const failingAndSucceedingToolCall = (repeat: number) => [
			`/repeat ${repeat}`,
			// one failing tool
			`/tool replaceRange ${JSON.stringify({ anchor: 'does not exist', text: 'replaced' })}`,
			// and one tool call that should succeed
			'/tool appendToNote { "text": "test" }',
		].join('\n');

		const userMessage = failingAndSucceedingToolCall(32);
		const result = await runNoteChat(
			onContext,
			[],
			userMessage,
			commands,
			() => {},
			new AbortController().signal,
		);

		const failedAttempts = [];
		for (let i = 0; i < 5; i++) {
			failedAttempts.push(
				{ role: ChatRole.Assistant },
				{ role: ChatRole.Tool, isError: true, toolName: 'replaceRange' },
				{ role: ChatRole.Tool, isError: false, toolName: 'appendToNote' },
			);
		}

		expect(result).toMatchObject([
			{ role: ChatRole.System },
			{ role: ChatRole.User, content: userMessage },

			...failedAttempts,

			{ role: ChatRole.Assistant, content: 'tool not found: replaceRange\ntool not found: appendToNote' },
		]);
	});
});
