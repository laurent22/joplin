import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import shim from '@joplin/lib/shim';
import InteropServiceHelper from './InteropServiceHelper';

const exportNoteToHtmlFile = (noteId: string): Promise<string> => {
	const helper = InteropServiceHelper as unknown as {
		exportNoteToHtmlFile: (noteId: string, options: Record<string, unknown>)=> Promise<string>;
	};
	return helper.exportNoteToHtmlFile(noteId, {});
};

describe('InteropServiceHelper', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should write the HTML file used for printing a conflict note', async () => {
		// Printing and PDF export load this file, so if the note is skipped they fail with ENOENT
		// See https://github.com/laurent22/joplin/issues/17105
		const folder = await Folder.save({ title: 'Folder' });
		const original = await Note.save({ title: 'Shopping list', body: 'milk', parent_id: folder.id });
		const conflict = await Note.save({ title: 'Shopping list', body: 'milk, coffee', parent_id: folder.id, is_conflict: 1, conflict_original_id: original.id });

		const htmlFile = await exportNoteToHtmlFile(conflict.id);

		expect(await shim.fsDriver().exists(htmlFile)).toBe(true);
		expect(await shim.fsDriver().readFile(htmlFile, 'utf8')).toContain('milk, coffee');
	});

	test('should still write the HTML file for a normal note', async () => {
		const folder = await Folder.save({ title: 'Folder' });
		const note = await Note.save({ title: 'Note', body: 'hello', parent_id: folder.id });

		const htmlFile = await exportNoteToHtmlFile(note.id);

		expect(await shim.fsDriver().readFile(htmlFile, 'utf8')).toContain('hello');
	});
});
