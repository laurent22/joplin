import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from './Folder';
import Note from './Note';
import NoteTag from './NoteTag';
import Tag from './Tag';

describe('models/NoteTag', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should remove associated tags when permanently deleting a note', (async () => {
		const folder1 = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['tag1', 'tag2']);
		await Tag.setNoteTagsByTitles(note2.id, ['tag2']);
		await Tag.save({ title: 'tag3' });
		let tag1 = await Tag.loadByTitle('tag1');
		let tag2 = await Tag.loadByTitle('tag2');

		expect((await Tag.noteIds(tag1.id)).sort()).toEqual([note1.id].sort());
		expect((await Tag.noteIds(tag2.id)).sort()).toEqual([note1.id, note2.id].sort());

		await NoteTag.deleteForNote(note1.id, {});

		tag1 = await Tag.loadByTitle('tag1');
		tag2 = await Tag.loadByTitle('tag2');

		const note1tags = await NoteTag.byNoteIds([note1.id]);
		const note2tags = await NoteTag.byNoteIds([note2.id]);

		expect(note1tags.length).toBe(0);
		expect(note2tags.length).toBe(1);
		expect(note2tags[0].tag_id).toBe(tag2.id);
	}));

});
