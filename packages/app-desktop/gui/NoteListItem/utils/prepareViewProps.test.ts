import { ListRendererDependency } from '@joplin/lib/services/plugins/api/noteListType';
import { FolderEntity, NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import prepareViewProps from './prepareViewProps';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

// Same as `prepareViewProps` but with default arguments to make testing code simpler.
const prepare = async (
	dependencies: ListRendererDependency[],
	note: NoteEntity,
	itemSize: Size = { width: 100, height: 20 },
	selected = false,
	noteTitleHtml = '',
	noteIsWatched = false,
	noteTags: TagEntity[] = [],
	folder: FolderEntity = null,
	itemIndex = 0,
) => {
	return prepareViewProps(
		dependencies,
		note,
		itemSize,
		selected,
		noteTitleHtml,
		noteIsWatched,
		noteTags,
		folder,
		itemIndex,
	);
};

describe('prepareViewProps', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should prepare note properties', async () => {
		const note = await Note.save({ title: 'test' });

		expect(await prepare(['note.title', 'note.user_updated_time'], note)).toEqual({
			note: {
				title: 'test',
				user_updated_time: note.user_updated_time,
			},
		});

		expect(await prepare(['item.size.height'], note)).toEqual({
			item: {
				size: {
					height: 20,
				},
			},
		});

		expect(await prepare(['item.selected'], note)).toEqual({
			item: {
				selected: false,
			},
		});

		expect(await prepare(['item.selected'], note, {}, true)).toEqual({
			item: {
				selected: true,
			},
		});

		expect(await prepare(['note.titleHtml'], note, {}, false, '<b>test</b>')).toEqual({
			note: {
				titleHtml: '<b>test</b>',
			},
		});

		expect(await prepare(['note.isWatched'], note, {}, false, '', true)).toEqual({
			note: {
				isWatched: true,
			},
		});

		expect(await prepare(['note.isWatched'], note, {}, false, '', false)).toEqual({
			note: {
				isWatched: false,
			},
		});

		expect(await prepare(['item.index'], note, {}, false, '', false, [], null, 5)).toEqual({
			item: {
				index: 5,
			},
		});

		expect(await prepare(['note.tags'], note, {}, false, '', false, [{ id: '1', title: 'one' }])).toEqual({
			note: {
				tags: [{ id: '1', title: 'one' }],
			},
		});
	});

	it('should return checkbox stats only when setting is enabled', async () => {
		const note = await Note.save({
			title: 'test',
			body: '- [ ] task 1\n- [x] task 2\n- [ ] task 3\n- [X] task 4',
		});

		Setting.setValue('notes.showCheckboxCompletionChart', true);
		expect(await prepare(['note.checkboxes'], note)).toEqual({
			note: {
				checkboxes: {
					total: 4,
					checked: 2,
					percent: 50,
					isComplete: false,
				},
			},
		});

		Setting.setValue('notes.showCheckboxCompletionChart', false);
		expect(await prepare(['note.checkboxes'], note)).toEqual({
			note: {
				checkboxes: null,
			},
		});
	});

	it('should return null for checkbox stats when note has no checkboxes', async () => {
		Setting.setValue('notes.showCheckboxCompletionChart', true);

		const note = await Note.save({
			title: 'test',
			body: 'This is a note without any checkboxes.',
		});

		const result = await prepare(['note.checkboxes'], note);
		expect(result).toEqual({
			note: {
				checkboxes: null,
			},
		});
	});

	it('should return isComplete true when all checkboxes are checked', async () => {
		Setting.setValue('notes.showCheckboxCompletionChart', true);

		const note = await Note.save({
			title: 'test',
			body: '- [x] task 1\n- [X] task 2\n- [x] task 3',
		});

		const result = await prepare(['note.checkboxes'], note);
		expect(result).toEqual({
			note: {
				checkboxes: {
					total: 3,
					checked: 3,
					percent: 100,
					isComplete: true,
				},
			},
		});
	});

});
