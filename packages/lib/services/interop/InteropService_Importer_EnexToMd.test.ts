import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { ImportModuleOutputFormat, ImportOptions } from './types';
import InteropService from './InteropService';
import Folder from '../../models/Folder';
const moment = require('moment');

// Suppress warning:
//
// Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment
// construction falls back to js Date(), which is not reliable across all browsers and versions. Non
// RFC2822/ISO date formats are discouraged. Please refer to
// http://momentjs.com/guides/#/warnings/js-date/ for more info.
//
// But what moment.js does it correct when you don't know the format of the date, which is what we
// simulate here with imported files.
moment.suppressDeprecationWarnings = true;

async function importFolder(path: string) {
	const importOptions: ImportOptions = {
		path: path,
		format: 'enex',
		outputFormat: ImportModuleOutputFormat.Markdown,
	};

	await InteropService.instance().import(importOptions);
}

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

		// Same-folder link
		expect(notes[1].body).toContain(`[Example note](:/${notes[0].id})`);
		// Cross-folder link
		expect(notes[1].body).toContain(`[Test](:/${notes[2].id})`);

		// Cross-folder link, using an https:// link
		expect(notes[2].body).toContain(`[Example note](:/${notes[0].id})`);
	});
});
