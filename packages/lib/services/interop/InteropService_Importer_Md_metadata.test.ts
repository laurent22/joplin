import InteropService_Importer_Md_metadata from '../../services/interop/InteropService_Importer_Md_metadata';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import time from '../../time';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';


describe('InteropService_Importer_Md_metadata: importMetadata', function() {
	async function importNote(path: string) {
		const importer = new InteropService_Importer_Md_metadata();
		importer.setMetadata({ fileExtensions: ['md', 'html'] });
		return await importer.importFile(path, 'notebook');
	}

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});
	it('should import file and set all metadata correctly', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/full.md`);
		const format = 'DD/MM/YYYY HH:mm';

		expect(note.title).toBe('Test Note Title');
		expect(time.formatMsToLocal(note.user_updated_time, format)).toBe('01/05/2019 16:54');
		expect(time.formatMsToLocal(note.user_created_time, format)).toBe('01/05/2019 16:54');
		expect(note.source_url).toBe('https://joplinapp.org');
		expect(note.author).toBe('Joplin');
		expect(note.latitude).toBe('37.08402100');
		expect(note.longitude).toBe('-94.51350100');
		expect(note.altitude).toBe('0.0000');
		expect(note.is_todo).toBe(1);
		expect(note.todo_completed).toBeUndefined();
		expect(time.formatMsToLocal(note.todo_due, format)).toBe('22/08/2021 00:00');
		expect(note.body).toBe('This is the note body\n');

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(3);

		const tagTitles = tags.map(tag => tag.title);
		expect(tagTitles).toContain('joplin');
		expect(tagTitles).toContain('note');
		expect(tagTitles).toContain('pencil');
	});
	it('should only import data from the first yaml block', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/split.md`);

		expect(note.title).toBe('xxx');
		expect(note.author).not.toBe('xxx');
		expect(note.body).toBe('---\nauthor: xxx\n---\n\nnote body\n');
	});
	it('should only import, duplicate notes and tags are not created', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/duplicates.md`);

		expect(note.title).toBe('ddd');
		const itemIds = await Note.linkedItemIds(note.body);
		expect(itemIds.length).toBe(1);

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(1);
	});
	it('should not import items as numbers', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/numbers.md`);

		expect(note.title).toBe('001');
		expect(note.body).toBe('note body\n');
	});
	it('should normalize whitespace and load correctly', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/normalize.md`);

		expect(note.title).toBe('norm');
		expect(note.body).toBe('note body\n');

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(3);
	});
	it('should load unquoted special forms correctl', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/unquoted.md`);

		expect(note.title).toBe('Unquoted');
		expect(note.body).toBe('note body\n');

		expect(note.longitude).toBe('-94.51350100');
		expect(note.is_todo).toBe(1);
		expect(note.todo_completed).toBeUndefined();
	});
});
