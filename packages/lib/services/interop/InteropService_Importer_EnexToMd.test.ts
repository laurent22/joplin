import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { ImportModuleOutputFormat, ImportOptions } from './types';
import InteropService from './InteropService';
import Folder from '../../models/Folder';

const importFolder = async (path: string) => {
	const importOptions: ImportOptions = {
		path: path,
		format: 'enex',
		outputFormat: ImportModuleOutputFormat.Markdown,
	};

	await InteropService.instance().import(importOptions);
};

const importTestFile = async (name: string) => {
	const enexSampleBaseDir = `${supportDir}/../enex_to_md`;
	await importFolder(`${enexSampleBaseDir}/${name}`);
};

describe('InteropService_Importer_EnexToMd', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should resolve cross-notebook links', async () => {
		await importTestFile('links/');

		const folders = await Folder.all({ order: [{ by: 'title', dir: 'ASC' }] });
		expect(folders).toMatchObject([
			{ title: 'notebook1', parent_id: '' },
			{ title: 'notebook2', parent_id: '' },
		]);

		const notes = await Note.all({ order: [{ by: 'title', dir: 'ASC' }] });
		expect(notes).toMatchObject([
			{ title: 'Example note', parent_id: folders[0].id },
			{ title: 'Note 2', parent_id: folders[0].id },
			{ title: 'Test', parent_id: folders[1].id },
			{ title: 'Test note', parent_id: folders[1].id },
			{ title: 'Testing', parent_id: folders[1].id },
		]);

		// Same-folder link (https:// link)
		expect(notes[1].body).toContain(`[Example note](:/${notes[0].id})`);
		// Cross-folder link (https:// link)
		expect(notes[1].body).toContain(`[Test](:/${notes[2].id})`);

		// Cross-folder link (https:// link)
		expect(notes[2].body).toContain(`[Example note](:/${notes[0].id})`);
		// Same-folder link (evernote:// link)
		expect(notes[2].body).toContain(`[Test note](:/${notes[3].id})`);
		expect(notes[4].body).toContain(`[Test](:/${notes[2].id})`);
	});

	it('should escape square brackets in note link text', async () => {
		await importTestFile('links-brackets/');

		const notes = await Note.all();
		const linkerNote = notes.find(note => note.title === 'Linker note');
		const targetNote = notes.find(note => note.title === 'simple note version [1]');

		expect(targetNote).toBeTruthy();

		// Brackets in the link text must be backslash-escaped so the inner "]"
		// does not prematurely close the link. See #15935.
		expect(linkerNote.body).toContain(`[simple note version \\[1\\]](:/${targetNote.id})`);
		expect(linkerNote.body).not.toContain(`[simple note version [1]](:/${targetNote.id})`);
	});

	it('should not mangle dollar signs in note link text', async () => {
		await importTestFile('links-dollar/');

		const notes = await Note.all();
		const linkerNote = notes.find(note => note.title === 'Linker note');
		const targetNote = notes.find(note => note.title === 'Cost $$ total');

		expect(targetNote).toBeTruthy();

		// "$$" in the title must be preserved verbatim. A plain string replacement
		// would interpret it and collapse it to a single "$".
		expect(linkerNote.body).toContain(`[Cost $$ total](:/${targetNote.id})`);
		expect(linkerNote.body).not.toContain(`[Cost $ total](:/${targetNote.id})`);
	});
});
