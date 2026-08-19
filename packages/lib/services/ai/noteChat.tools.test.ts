import { runNoteChat } from './noteChat';
import { ChatMessage, ChatRole } from './types';
import { setupDatabase, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import { NoteEntity } from '../database/types';
import { NoteContext, ToolDefinition } from './tools/types';

const runChatForNote = (note: NoteEntity, history: ChatMessage[], message: string) => {
	const getContext = async () => {
		const currentNote = await Note.load(note.id);
		return <NoteContext> {
			title: currentNote.title,
			body: currentNote.body,
			selection: null,
			noteId: note.id,
			folderId: note.parent_id,
		};
	};

	return runNoteChat(
		getContext,
		history,
		message,
		{
			replaceSelection: jest.fn(),
			updateNoteBody: async (newBody: string) => {
				await Note.save({ id: note.id, body: newBody });
			},
			displayError: jest.fn(),
		},
		jest.fn(),
		new AbortController().signal,
	);
};

describe('noteChat.tools', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
		Setting.setValue('ai.chat.providerType', 'test-provider');
		Setting.setValue('ai.enabled', true);
	});

	test('should use valid identifiers for tools', async () => {
		const note = await Note.save({ title: 'test' });

		const allToolDefinitions = async () => {
			const chat = await runChatForNote(
				note,
				[{ role: ChatRole.User, content: 'testing' }],
				'/list-tools',
			);
			const lastMessage = chat[chat.length - 1];
			expect(typeof lastMessage?.content).toBe('string');
			const responseJson: ToolDefinition[] = JSON.parse(lastMessage.content as string);
			return responseJson;
		};

		// Certain providers have more restrictive ID requirements. All tools exposed in the chat panel
		// should satisfy these requirements.
		// See https://discourse.joplinapp.org/t/400-error-with-ai-chat/50615
		const isValidId = (id: string) => !!id.match(/^[a-zA-Z0-9_-]{1,128}$/);
		const idValidity = (await allToolDefinitions()).map(tool => ({
			id: tool.id,
			valid: isValidId(tool.id),
		}));
		expect(idValidity).toEqual(idValidity.map(result => ({ ...result, valid: true })));
	});

	test('should allow external tools when enabled in settings', async () => {
		const note = await Note.save({ title: 'test' });

		const toolOptions = {
			note_id: note.id,
			add: ['test'],
		};
		const toolCallMessage = `/tool manage_tags ${JSON.stringify(toolOptions)}`;
		const runChat = () => (
			runChatForNote(
				note,
				// Avoid the default history
				[{ role: ChatRole.User, content: 'testing' }],
				toolCallMessage,
			)
		);

		// Should not allow managing tags when disabled in settings
		Setting.setValue('ai.tool.manage_tags.enabled', false);
		await runChat();
		expect(await Tag.tagsByNoteId(note.id)).toHaveLength(0);

		// Should allow managing tags when enabled
		Setting.setValue('ai.tool.manage_tags.enabled', true);
		await runChat();
		expect(await Tag.tagsByNoteId(note.id)).toHaveLength(1);
	});

	test('running a disabled tool should provide information how to enable it', async () => {
		const note = await Note.save({ title: 'test' });

		const toolCallMessage = `/tool manage_tags ${JSON.stringify({ someArg: 'test' })}`;
		const runChat = () => (
			runChatForNote(
				note,
				// Avoid the default history
				[{ role: ChatRole.User, content: 'testing' }],
				toolCallMessage,
			)
		);

		// Should not allow managing tags when disabled in settings
		Setting.setValue('ai.tool.manage_tags.enabled', false);
		const messages = await runChat();
		const infoMessage = messages.find(message => message.role === ChatRole.Tool && message.toolName === 'manage_tags');
		expect(infoMessage).toBeTruthy();
		expect(infoMessage.content).toContain('Tool `manage_tags` is disabled in Joplin\'s settings');
	});
});
