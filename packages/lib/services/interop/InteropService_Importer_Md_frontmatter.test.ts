import InteropService_Importer_Md_frontmatter from '../../services/interop/InteropService_Importer_Md_frontmatter';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import time from '../../time';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';

async function importNote(path: string) {
	const importer = new InteropService_Importer_Md_frontmatter();
	importer.setMetadata({ fileExtensions: ['md', 'html'] });
	return await importer.importFile(path, 'notebook');
}

const importTestFile = async (name: string) => {
	return importNote(`${supportDir}/test_notes/yaml/${name}`);
};

describe('InteropService_Importer_Md_frontmatter: importMetadata', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});
	it('should import file and set all metadata correctly', async () => {
		const note = await importTestFile('full.md');
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
	it('should only import data from the first yaml block', async () => {
		const note = await importTestFile('split.md');

		expect(note.title).toBe('xxx');
		expect(note.author).not.toBe('xxx');
		expect(note.body).toBe('---\nauthor: xxx\n---\n\nnote body\n');
	});
	it('should only import, duplicate notes and tags are not created', async () => {
		const note = await importTestFile('duplicates.md');

		expect(note.title).toBe('ddd');
		const itemIds = await Note.linkedItemIds(note.body);
		expect(itemIds.length).toBe(1);

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(1);
	});
	it('should not import items as numbers', async () => {
		const note = await importTestFile('numbers.md');

		expect(note.title).toBe('001');
		expect(note.body).toBe('note body\n');
	});
	it('should normalize whitespace and load correctly', async () => {
		const note = await importTestFile('normalize.md');

		expect(note.title).toBe('norm');
		expect(note.body).toBe('note body\n');

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(3);
	});
	it('should load unquoted special forms correctly', async () => {
		const note = await importTestFile('unquoted.md');

		expect(note.title).toBe('Unquoted');
		expect(note.body).toBe('note body\n');

		expect(note.longitude).toBe('-94.51350100');
		expect(note.is_todo).toBe(1);
		expect(note.todo_completed).toBeUndefined();
	});
	it('should load notes with newline in the title', async () => {
		const note = await importTestFile('title_newline.md');

		expect(note.title).toBe('First\nSecond');
	});
	it('should import dates (without time) correctly', async () => {
		const note = await importTestFile('short_date.md');
		const format = 'YYYY-MM-DD HH:mm';

		expect(time.formatMsToLocal(note.user_updated_time, format)).toBe('2021-01-01 00:00');
		expect(time.formatMsToLocal(note.user_created_time, format)).toBe('2017-01-01 00:00');
	});
	it('should load tags even with the inline syntax', async () => {
		const note = await importTestFile('inline_tags.md');

		expect(note.title).toBe('Inline Tags');

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(2);
	});
	it('should import r-markdown files correctly and set what metadata it can', async () => {
		const note = await importTestFile('r-markdown.md');
		const format = 'YYYY-MM-DD HH:mm';

		expect(note.title).toBe('YAML metadata for R Markdown with examples');
		expect(time.formatMsToLocal(note.user_updated_time, format)).toBe('2021-06-10 00:00');
		expect(time.formatMsToLocal(note.user_created_time, format)).toBe('2021-06-10 00:00');
		expect(note.author).toBe('Hao Liang');

		const tags = await Tag.tagsByNoteId(note.id);
		expect(tags.length).toBe(2);

		const tagTitles = tags.map(tag => tag.title);
		expect(tagTitles).toContain('yaml');
		expect(tagTitles).toContain('rmd');
	});
	it('should import r-markdown files with alternative author syntax', async () => {
		const note = await importTestFile('r-markdown_author.md');

		expect(note.title).toBe('Distill for R Markdown');
		expect(note.author).toBe('JJ Allaire');
	});
	it('should handle date formats with timezone information', async () => {
		const note = await importTestFile('utc.md');

		expect(note.user_updated_time).toBe(1556729640000);
		expect(note.user_created_time).toBe(1556754840000);
	});

	it('should accept file with no newline after the block marker', async () => {
		const note = await importTestFile('no_newline_after_marker.md');
		expect(note.body).toBe('note body\n');
	});

	it('should handle multiple newlines before the note body', async () => {
		const note = await importTestFile('multiple_newlines_after_marker.md');
		expect(note.body).toBe('\n\nnote body');
	});
});
