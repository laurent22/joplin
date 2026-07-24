import { _internal, ChatCommands, runNoteChat } from './noteChat';
import { ChatRole, ChatToolCall } from './types';
import { expectThrow, setupDatabase, switchClient, withWarningSilenced } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import { NoteContext } from './tools/types';
import ToolIndex from './tools/ToolIndex';

const makeTestContext = (defaultContext: Partial<NoteContext>) => {
	const initialContext: NoteContext = {
		title: 'Test',
		body: 'Body',
		noteId: '00000000000000000000000000000000',
		folderId: '00000000000000000000000000000001',
		selection: null,
		...defaultContext,
	};
	let body = initialContext.body;

	const commands: ChatCommands = {
		replaceSelection: jest.fn(),
		updateNoteBody: (newBody) => {
			body = newBody;
			return Promise.resolve();
		},
		displayError: jest.fn(),
	};

	const context = () => ({ ...initialContext, body });

	return {
		onContext: () => Promise.resolve(context()),
		get context() { return context(); },
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
			noteId: '',
			folderId: '',
		});
		expect(prompt).toContain('My note');
		expect(prompt).toContain('just this bit');
		expect(prompt).toContain('BEGIN SELECTION');
		expect(prompt).not.toContain('long body text');
	});

	test('systemPrompt advertises Joplin-specific Markdown features', () => {
		const prompt = _internal.systemPrompt({ title: 'n', body: 'b', noteId: '', folderId: '', selection: null });
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

	test('systemPrompt should not include body', () => {
		const prompt = _internal.systemPrompt({
			title: 'My note',
			body: 'the whole body',
			noteId: '',
			folderId: '',
			selection: null,
		});
		// Including the body in the prompt would cause a cache invalidation on each note change
		expect(prompt).not.toContain('the whole body');
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
			expectedOperations: ['insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'readNote'],
		},
		{
			label: 'offers replaceFencedBlock when Mermaid block present',
			note: {
				title: 'n',
				body: '```mermaid\ngitGraph\n\tcommit\n```\n',
				selection: null,
			},
			expectedOperations: ['insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'replaceFencedBlock', 'readNote'],
		},
	])('toolDefinitions should include the expected operations (case $label)', ({ note, expectedOperations }) => {
		const { commands, context } = makeTestContext(note);
		const editSchemaItems = new ToolIndex({ note: context, commands }).enabledTools();

		const allowedSchemaOperations = editSchemaItems.map(item => item.id).sort();
		expect(
			allowedSchemaOperations.filter(id => id.startsWith('editor.')),
		).toEqual(expectedOperations.map(id => `editor.${id}`).sort());
	});

	test('estimateTokens approximates char/4', () => {
		expect(_internal.estimateTokens('')).toBe(0);
		expect(_internal.estimateTokens('a'.repeat(400))).toBe(100);
	});

	test('toolDefinitions advertises replaceFencedBlock with structured-block guidance', () => {
		const { context, commands } = makeTestContext({ title: 'n', body: '```abc\n```', selection: null });
		const tools = new ToolIndex({ note: context, commands }).enabledTools();
		const toolDefinition = tools.find(tool => tool.id === 'editor.replaceFencedBlock');
		expect(toolDefinition).toBeTruthy();
		expect(toolDefinition.description).toContain('jsoncanvas');
		// Guidance to use the op for structured blocks, appendToNote for creation.
		expect(toolDefinition.description).toContain('"text" is the new content inside the fence (no fence markers)');
		expect(toolDefinition.description).toContain('Use appendToNote');
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
			{ toolName: 'editor.appendToNote', callId: 'call-1', arguments: { text: 'Test.' }, parseError: null },
			{ toolName: 'editor.replaceRange', callId: 'call-2', arguments: { anchor: 'Body', text: 'Updated' }, parseError: null },
		];

		const { onContext, commands } = makeTestContext({});

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
				toolName: 'editor.appendToNote',
				toolCallId: 'call-1',
				isError: false,
				userDescription: 'Added 1 word',
			},
			{
				role: ChatRole.Tool,
				toolName: 'editor.replaceRange',
				toolCallId: 'call-2',
				isError: false,
				userDescription: 'Removed 1 word\nAdded 1 word',
			},
		]);
	});

	test('noteChat should stop retry loop if several responses in a row include tool failures', async () => {
		const { onContext, commands } = makeTestContext({});
		const failingAndSucceedingToolCall = (repeat: number) => [
			`/repeat ${repeat}`,
			// one failing tool
			`/tool editor.replaceRange ${JSON.stringify({ anchor: 'does not exist', text: 'replaced' })}`,
			// and one tool call that should succeed
			'/tool editor.appendToNote { "text": "test" }',
		].join('\n');

		const userMessage = failingAndSucceedingToolCall(32);
		const result = await withWarningSilenced(
			/call editor\.replaceRange failed/,
			() => runNoteChat(
				onContext,
				[],
				userMessage,
				commands,
				() => {},
				new AbortController().signal,
			),
		);

		const failedAttempts = [];
		for (let i = 0; i < 5; i++) {
			failedAttempts.push(
				{ role: ChatRole.Assistant },
				{ role: ChatRole.Tool, isError: true, toolName: 'editor.replaceRange' },
				{ role: ChatRole.Tool, isError: false, toolName: 'editor.appendToNote' },
			);
		}

		expect(result).toMatchObject([
			{ role: ChatRole.System },
			{ role: ChatRole.User, content: userMessage },

			// Reading the body
			{ role: ChatRole.Assistant },
			{ role: ChatRole.Tool },

			...failedAttempts,

			{ role: ChatRole.Assistant, content: 'tool not found: editor.replaceRange\ntool not found: editor.appendToNote' },
		]);
	});

	test('noteChat initialize the chat history with the note body', async () => {
		const { onContext, commands } = makeTestContext({});

		const result = await runNoteChat(
			onContext,
			[],
			'test',
			commands,
			() => {},
			new AbortController().signal,
		);

		expect(result).toMatchObject([
			{ role: ChatRole.System },
			{ role: ChatRole.User, content: 'test' },
			{ role: ChatRole.Assistant, content: '', toolCalls: [{ toolName: 'editor.readNote' }] },
			{ role: ChatRole.Tool, content: 'Body', toolName: 'editor.readNote' },
			{ role: ChatRole.Assistant, content: '' },
		]);
	});
});
