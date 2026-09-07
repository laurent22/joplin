import { runtime } from './linkToNote';
import CommandService, { CommandContext } from '@joplin/lib/services/CommandService';
import Note from '@joplin/lib/models/Note';
import { ModelType } from '@joplin/lib/BaseModel';
import { MarkupLanguage } from '@joplin/renderer';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

describe('linkToNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should insert a markdown link when current note is markdown', async () => {
		const mdNote = await Note.save({ title: 'Markdown Note', body: 'some content' });
		const targetNote = { id: 'target_note_123', title: 'Target Note' };

		let insertedText = '';
		jest.spyOn(CommandService.instance(), 'execute').mockImplementation(async (commandName: string, ...args: unknown[]) => {
			if (commandName === 'gotoAnything') {
				return {
					type: ModelType.Note,
					item: targetNote,
				};
			}
			if (commandName === 'insertText') {
				insertedText = args[0] as string;
				return null;
			}
			return null;
		});

		const context = {
			state: {
				selectedNoteIds: [mdNote.id],
			},
		} as unknown as CommandContext;

		await runtime().execute(context);
		expect(insertedText).toBe('[Target Note](:/target_note_123)');
	});

	test('should insert an HTML link when current note is HTML format', async () => {
		const htmlNote = await Note.save({
			title: 'HTML Note',
			body: '<p>some content</p>',
			markup_language: MarkupLanguage.Html,
		});
		const targetNote = { id: 'target_note_456', title: 'Target Note' };

		let insertedText = '';
		jest.spyOn(CommandService.instance(), 'execute').mockImplementation(async (commandName: string, ...args: unknown[]) => {
			if (commandName === 'gotoAnything') {
				return {
					type: ModelType.Note,
					item: targetNote,
				};
			}
			if (commandName === 'insertText') {
				insertedText = args[0] as string;
				return null;
			}
			return null;
		});

		const context = {
			state: {
				selectedNoteIds: [htmlNote.id],
			},
		} as unknown as CommandContext;

		await runtime().execute(context);
		expect(insertedText).toBe('<a href=":/target_note_456">Target Note</a>');
	});

	test('should escape special characters in HTML link title', async () => {
		const htmlNote = await Note.save({
			title: 'HTML Note',
			body: '<p>some content</p>',
			markup_language: MarkupLanguage.Html,
		});
		const targetNote = { id: 'target_note_789', title: '<Special & "Title">' };

		let insertedText = '';
		jest.spyOn(CommandService.instance(), 'execute').mockImplementation(async (commandName: string, ...args: unknown[]) => {
			if (commandName === 'gotoAnything') {
				return {
					type: ModelType.Note,
					item: targetNote,
				};
			}
			if (commandName === 'insertText') {
				insertedText = args[0] as string;
				return null;
			}
			return null;
		});

		const context = {
			state: {
				selectedNoteIds: [htmlNote.id],
			},
		} as unknown as CommandContext;

		await runtime().execute(context);
		expect(insertedText).toBe('<a href=":/target_note_789">&lt;Special &amp; &quot;Title&quot;&gt;</a>');
	});

	test('should fall back to note id if target note title is empty in HTML notes', async () => {
		const htmlNote = await Note.save({
			title: 'HTML Note',
			body: '<p>some content</p>',
			markup_language: MarkupLanguage.Html,
		});
		const targetNote = { id: 'target_note_000', title: '' };

		let insertedText = '';
		jest.spyOn(CommandService.instance(), 'execute').mockImplementation(async (commandName: string, ...args: unknown[]) => {
			if (commandName === 'gotoAnything') {
				return {
					type: ModelType.Note,
					item: targetNote,
				};
			}
			if (commandName === 'insertText') {
				insertedText = args[0] as string;
				return null;
			}
			return null;
		});

		const context = {
			state: {
				selectedNoteIds: [htmlNote.id],
			},
		} as unknown as CommandContext;

		await runtime().execute(context);
		expect(insertedText).toBe('<a href=":/target_note_000">target_note_000</a>');
	});

	test('should default to markdown syntax when no note is selected', async () => {
		const targetNote = { id: 'target_note_123', title: 'Target Note' };

		let insertedText = '';
		jest.spyOn(CommandService.instance(), 'execute').mockImplementation(async (commandName: string, ...args: unknown[]) => {
			if (commandName === 'gotoAnything') {
				return {
					type: ModelType.Note,
					item: targetNote,
				};
			}
			if (commandName === 'insertText') {
				insertedText = args[0] as string;
				return null;
			}
			return null;
		});

		const context = {
			state: {},
		} as unknown as CommandContext;

		await runtime().execute(context);
		expect(insertedText).toBe('[Target Note](:/target_note_123)');
	});
});
