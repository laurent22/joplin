import InteropService from '../../services/interop/InteropService';
import { setupDatabaseAndSynchronizer, switchClient, exportDir } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import time from '../../time';
import { fieldOrder } from './InteropService_Exporter_Md_metadata';
import * as fs from 'fs-extra';

async function recreateExportDir() {
	const dir = exportDir();
	await fs.remove(dir);
	await fs.mkdirp(dir);
}

describe('interop/InteropService_Exporter_Md_metadata', function() {
	async function exportAndLoad(path: string): Promise<string> {
		const service = InteropService.instance();

		await service.export({
			path: exportDir(),
			format: 'md_metadata',
		});

		return await fs.readFile(path, 'utf8');
	}

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await recreateExportDir();
		done();
	});

	test('should export MD file with YAML header', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'ma', user_updated_time: 1, user_created_time: 1, body: '**ma note**', parent_id: folder1.id });

		const content = await exportAndLoad(`${exportDir()}/folder1/ma.md`);
		expect(content.startsWith('---')).toBe(true);
		expect(content).toContain('Title: ma');
		expect(content).toContain('Updated:'); // Will be current time of test run
		expect(content).toContain(`Created: ${time.formatMsToLocal(1)}`);
		expect(content).toContain('Latitude: 0.00000000');
		expect(content).toContain('Longitude: 0.00000000');
		expect(content).toContain('Altitude: 0.0000');
		expect(content).toContain('**ma note**');
		expect(content).not.toContain('Completed?');
		expect(content).not.toContain('Author');
		expect(content).not.toContain('Source');
		expect(content).not.toContain('Due');
	}));

	test('should export without additional quotes', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: '-60', body: '**ma note**', parent_id: folder1.id });

		const content = await exportAndLoad(`${exportDir()}/folder1/-60.md`);
		expect(content).toContain('Title: -60');
		expect(content).toContain('Latitude: 0.00000000');
	}));

	test('should export tags', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note = await Note.save({ title: 'Title', body: '**ma note**', parent_id: folder1.id });
		await Tag.addNoteTagByTitle(note.id, 'lamp');
		await Tag.addNoteTagByTitle(note.id, 'moth');
		await Tag.addNoteTagByTitle(note.id, 'godzilla');

		const content = await exportAndLoad(`${exportDir()}/folder1/Title.md`);
		expect(content).toContain('Tags:\n  - godzilla\n  - lamp\n  - moth');
	}));

	test('should export todo', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'Todo', is_todo: 1, todo_due: 1, body: '**ma note**', parent_id: folder1.id });

		const content = await exportAndLoad(`${exportDir()}/folder1/Todo.md`);
		expect(content).toContain(`Due: ${time.formatMsToLocal(1)}`);
		expect(content).toContain('Completed?: No');
	}));

	test('should export author', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'Author', author: 'Scott Joplin', body: '**ma note**', parent_id: folder1.id });

		const content = await exportAndLoad(`${exportDir()}/folder1/Author.md`);
		expect(content).toContain('Author: Scott Joplin');
	}));

	test('should export source', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'Source', source_url: 'https://joplinapp.org', body: '**ma note**', parent_id: folder1.id });

		const content = await exportAndLoad(`${exportDir()}/folder1/Source.md`);
		expect(content).toContain('Source: https://joplinapp.org');
	}));

	test('should export fields in the correct order', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });

		const note = await Note.save({
			title: 'Fields',
			is_todo: 1,
			todo_due: 1,
			author: 'Scott Joplin',
			source_url: 'https://joplinapp.org',
			body: '**ma note**',
			parent_id: folder1.id,
		});
		await Tag.addNoteTagByTitle(note.id, 'piano');
		await Tag.addNoteTagByTitle(note.id, 'greatness');

		const content = await exportAndLoad(`${exportDir()}/folder1/Fields.md`);
		const fieldIndices = fieldOrder.map(field => content.indexOf(field));
		expect(fieldIndices).toBe(fieldIndices.sort());
	}));

	test('should export title with a newline encoded', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'Source\ntitle', body: '**ma note**', parent_id: folder1.id });

		const content = await exportAndLoad(`${exportDir()}/folder1/Source_title.md`);
		expect(content).toContain('Title: |-\n  Source\n  title');
	}));
});
