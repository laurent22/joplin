import Note from '../../models/Note';
import Tag from '../../models/Tag';
import time from '../../time';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { ImportModuleOutputFormat, ImportOptions } from './types';
import InteropService from './InteropService';
import Folder from '../../models/Folder';
import { NoteEntity } from '../database/types';

async function importNote(path: string) {
	const folder = await Folder.save({});
	const importOptions: ImportOptions = {
		path: path,
		format: 'md_frontmatter',
		destinationFolderId: folder.id,
		outputFormat: ImportModuleOutputFormat.Markdown,
	};

	await InteropService.instance().import(importOptions);

	const allNotes = await Note.all();
	return allNotes[0];
}

const importTestFile = async (name: string): Promise<NoteEntity> => {
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
		expect(note.todo_completed).toBe(0);
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
		expect(note.todo_completed).toBe(0);
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
	it('should import Notesnook files with created and update timestamps', async () => {
		const note = await importTestFile('notesnook_updated_created.md');

		expect(note.title).toBe('Frontmatter test');
		expect(note.user_created_time).toBe(Date.parse('2024-01-01T01:23:00.000'));
		expect(note.user_updated_time).toBe(Date.parse('2024-01-02T04:56:00.000'));
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

	it('should accept note with a title that starts with a dash', async () => {
		const note = await importTestFile('title_start_with_dash.md');
		expect(note.title).toBe('-Start with dash');
	});

	it('should import a note that contains an image in DataUrl format', async () => {
		const note = await importTestFile('note_with_dataurl_image.md');
		// cSpell:disable
		expect(note.body).toBe('<img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2023%2038%22%3E%3Cpath%20d%3D%22M16.6%2038.1h-5.5l-.2-2.9-.2%202.9h-5.5L5%2025.3l-.8%202a1.53%201.53%200%2001-1.9.9l-1.2-.4a1.58%201.58%200%2001-1-1.9v-.1c.3-.9%203.1-11.2%203.1-11.2a2.66%202.66%200%20012.3-2l.6-.5a6.93%206.93%200%20014.7-12%206.8%206.8%200%20014.9%202%207%207%200%20012%204.9%206.65%206.65%200%2001-2.2%205l.7.5a2.78%202.78%200%20012.4%202s2.9%2011.2%202.9%2011.3a1.53%201.53%200%2001-.9%201.9l-1.3.4a1.63%201.63%200%2001-1.9-.9l-.7-1.8-.1%2012.7zm-3.6-2h1.7L14.9%2020.3l1.9-.3%202.4%206.3.3-.1c-.2-.8-.8-3.2-2.8-10.9a.63.63%200%2000-.6-.5h-.6l-1.1-.9h-1.9l-.3-2a4.83%204.83%200%20003.5-4.7A4.78%204.78%200%200011%202.3H10.8a4.9%204.9%200%2000-1.4%209.6l-.3%202h-1.9l-1%20.9h-.6a.74.74%200%2000-.6.5c-2%207.5-2.7%2010-3%2010.9l.3.1L4.8%2020l1.9.3.2%2015.8h1.6l.6-8.4a1.52%201.52%200%20011.5-1.4%201.5%201.5%200%20011.5%201.4l.9%208.4zm-10.9-9.6zm17.5-.1z%22%20style%3D%22isolation%3Aisolate%22%20fill%3D%22%23333%22%20opacity%3D%22.7%22/%3E%3Cpath%20d%3D%22M5.9%2013.6l1.1-.9h7.8l1.2.9%22%20fill%3D%22%23ce592c%22/%3E%3Cellipse%20cx%3D%2210.9%22%20cy%3D%2213.1%22%20rx%3D%222.7%22%20ry%3D%22.3%22%20style%3D%22isolation%3Aisolate%22%20fill%3D%22%23ce592c%22%20opacity%3D%22.5%22/%3E%3Cpath%20d%3D%22M20.6%2026.1l-2.9-11.3a1.71%201.71%200%2000-1.6-1.2H5.699999999999999a1.69%201.69%200%2000-1.5%201.3l-3.1%2011.3a.61.61%200%2000.3.7l1.1.4a.61.61%200%2000.7-.3l2.7-6.7.2%2016.8h3.6l.6-9.3a.47.47%200%2001.44-.5h.06c.4%200%20.4.2.5.5l.6%209.3h3.6L15.7%2020.3l2.5%206.6a.52.52%200%2000.66.31l1.2-.4a.57.57%200%2000.5-.7z%22%20fill%3D%22%23fdbf2d%22/%3E%3Cpath%20d%3D%22M7%2013.6l3.9%206.7%203.9-6.7%22%20style%3D%22isolation%3Aisolate%22%20fill%3D%22%23cf572e%22%20opacity%3D%22.6%22/%3E%3Ccircle%20cx%3D%2210.9%22%20cy%3D%227%22%20r%3D%225.9%22%20fill%3D%22%23fdbf2d%22/%3E%3C/svg%3E" alt="Street View Pegman Control" style="height:30px;width:30px;position:absolute;transform:translate(-50%,-50%);pointer-events:none">');
		// cSpell:enable
	});

	it('should recognize frontmatter in a file that starts with a UTF8 byte order mark', async () => {
		const note = await importTestFile('note_with_byte_order_mark.md');
		expect(note.title).toBe('Frontmatter test');
		expect(note.body).toBe('This note begins with an invisible byte order mark, just before its frontmatter.\n');

		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title).sort();
		expect(tags).toMatchObject(['tag1', 'tag2']);
	});

	it('should import completed tasks', async () => {
		const note = await importTestFile('task_completed.md');

		expect(note.title).toBe('Task');
		expect(note.body).toBe('This is a test. This task should import as completed.\n');
		expect(note.is_todo).toBe(1);
		expect(note.todo_completed).toBeGreaterThan(0);
	});

	it('should import notes that are not tasks', async () => {
		const note = await importTestFile('not_a_task.md');

		expect(note).toMatchObject({
			title: 'Not a task',
			body: 'This is a note.',
			is_todo: 0,
			todo_completed: 0,
		});
	});
});
