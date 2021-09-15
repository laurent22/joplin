import InteropService_Importer_Yaml from '../../services/interop/InteropService_Importer_Yaml';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import Time from '../../time';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';


describe('InteropService_Importer_Yaml: importMetadata', function() {
	async function importNote(path: string) {
		const importer = new InteropService_Importer_Yaml();
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

		expect(note.title).toBe('Test Note Title');
		expect(note.user_updated_time).toBe(1556754840000);
		expect(note.user_created_time).toBe(1556754840000);
		expect(note.source_url).toBe('https://joplinapp.org');
		expect(note.author).toBe('Joplin');
		expect(note.latitude).toBe('37.08402100');
		expect(note.longitude).toBe('-94.51350100');
		expect(note.altitude).toBe('0.0000');
		expect(note.is_todo).toBe(1);
		expect(note.todo_completed).toBeUndefined();
		expect(note.todo_due).toBe(1629615600000);
		expect(note.body).toBe('This is the note body\n');

		// Wait for tags to be populated in the database
		await Time.msleep(500);

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
	it('should only import duplicate notes and tags are not created', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/duplicates.md`);

		expect(note.title).toBe('ddd');
		const itemIds = await Note.linkedItemIds(note.body);
		expect(itemIds.length).toBe(1);

		// Wait for tags to be populated in the database
		await Time.msleep(500);

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(1);
	});
	it('should not import items as numbers', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/numbers.md`);

		expect(note.title).toBe('001');
		expect(note.body).toBe('note body\n');
	});
	it('should normalize whitespace a load correctly', async function() {
		const note = await importNote(`${supportDir}/test_notes/yaml/normalize.md`);

		expect(note.title).toBe('norm');
		expect(note.body).toBe('note body\n');

		// Wait for tags to be populated in the database
		await Time.msleep(500);

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(3);
	});
});
