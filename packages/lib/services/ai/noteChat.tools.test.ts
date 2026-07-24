import { runNoteChat } from './noteChat';
import { ChatMessage, ChatRole } from './types';
import { setupDatabase, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import { NoteEntity } from '../database/types';
import { NoteContext } from './tools/types';

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

	test('help.disabled_tools\'s description should list the disabled tools', async () => {
		const note = await Note.save({ title: 'test' });

		const toolInfoMessage = '/describe-tool help.disabled_tools';
		const runChat = () => (
			runChatForNote(
				note,
				// Avoid the default history
				[{ role: ChatRole.User, content: 'testing' }],
				toolInfoMessage,
			)
		);

		// Should not allow managing tags when disabled in settings
		Setting.setValue('ai.tool.edit_current.enabled', false);
		const messages = await runChat();
		const infoMessage = messages[messages.length - 1];
		expect(infoMessage).toBeTruthy();

		const content = infoMessage.content;
		expect(content).toContain('help.disabled_tools: **Getting access to more tools:**');
		expect(content).toContain('appendToNote');
	});

	test('running help.disabled_tools should provide information about disabled tools', async () => {
		const note = await Note.save({ title: 'test' });

		const toolCallMessage = `/tool help.disabled_tools ${JSON.stringify({ tool_id: 'manage_tags' })}`;
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
		const infoMessage = messages.find(message => message.role === ChatRole.Tool && message.toolName === 'help.disabled_tools');
		expect(infoMessage).toBeTruthy();
		expect(infoMessage.content).toContain('Tool `manage_tags` is disabled in Joplin\'s settings');
	});
});
