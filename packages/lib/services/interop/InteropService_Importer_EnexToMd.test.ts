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
	});
});
