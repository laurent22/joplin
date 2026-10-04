import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { ImportModuleOutputFormat, ImportOptions } from './types';
import InteropService from './InteropService';
import Folder from '../../models/Folder';
import { isRecoverableError } from '../../import-enex';

const importFolder = async (path: string, onError: ImportOptions['onError'] = null) => {
	const importOptions: ImportOptions = {
		path: path,
		format: 'enex',
		outputFormat: ImportModuleOutputFormat.Markdown,
		onError,
	};

	await InteropService.instance().import(importOptions);
};

const importTestFile = async (name: string, onError: ImportOptions['onError'] = null) => {
	const enexSampleBaseDir = `${supportDir}/../enex_to_md`;
	await importFolder(`${enexSampleBaseDir}/${name}`, onError);
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

	it('should import notes even if the file contains unescaped ampersands', async () => {
		const errors: Error[] = [];
		await importTestFile('unescaped_ampersand.enex', error => errors.push(error));

		const notes = await Note.all({ order: [{ by: 'title', dir: 'ASC' }] });
		expect(notes.map(n => n.title)).toEqual([
			'Note after the bad one',
			'Unescaped ampersand',
		]);
		expect(notes[0].body).toContain('This note must still be imported');
		expect(notes[1].body).toContain('Mobilize & Measure');

		// Reported, but flagged so it's not presented as a failed import.
		expect(errors.length).toBe(1);
		expect(isRecoverableError(errors[0])).toBe(true);
	});
});
