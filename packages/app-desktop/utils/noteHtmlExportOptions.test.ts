import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import InteropService from '@joplin/lib/services/interop/InteropService';
import shim from '@joplin/lib/shim';
import { setupDatabaseAndSynchronizer, switchClient, tempFilePath } from '@joplin/lib/testing/test-utils';
import noteHtmlExportOptions from './noteHtmlExportOptions';

describe('noteHtmlExportOptions', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test.each([
		['a note', 0],
		['a conflict note', 1],
	])('should export %s to an HTML file', async (_label, isConflict) => {
		const folder = await Folder.save({ title: 'notebook' });
		const note = await Note.save({ title: 'note', body: 'Some text', parent_id: folder.id, is_conflict: isConflict });
		const path = tempFilePath('html');

		await InteropService.instance().export(noteHtmlExportOptions(note.id, path));

		expect(await shim.fsDriver().readFile(path, 'utf8')).toContain('Some text');
	});
});
