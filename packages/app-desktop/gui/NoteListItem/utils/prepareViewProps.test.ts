import { ListRendererDependency } from '@joplin/lib/services/plugins/api/noteListType';
import { FolderEntity, NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import prepareViewProps from './prepareViewProps';
import Note from '@joplin/lib/models/Note';
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

});
