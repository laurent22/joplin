import { NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import { dropHeaderAt } from './useDragAndDrop';

const defaultColumns: NoteListColumns = [
	{
		name: 'note.todo_completed:display',
		width: 40,
	},
	{
		name: 'note.user_updated_time:display',
		width: 100,
	},
	{
		name: 'note.titleHtml',
		width: 0,
	},
];

describe('useDragAndDrop', () => {

	test.each([
		[
			defaultColumns,
			{
				name: 'note.titleHtml',
			},
			{
				columnName: 'note.todo_completed:display',
				location: 'before',
			},
			[
				'note.titleHtml',
				'note.todo_completed:display',
				'note.user_updated_time:display',
			],
		],
		[
			defaultColumns,
			{
				name: 'note.titleHtml',
			},
			{
				columnName: 'note.user_updated_time:display',
				location: 'before',
			},
			[
				'note.todo_completed:display',
				'note.titleHtml',
				'note.user_updated_time:display',
			],
		],
		[
			defaultColumns,
			{
				name: 'note.titleHtml',
			},
			{
				columnName: 'note.user_updated_time:display',
				location: 'after',
			},
			[
				'note.todo_completed:display',
				'note.user_updated_time:display',
				'note.titleHtml',
			],
		],
	])('should drop columns', (columns, header, insertAt, expected) => {
		const actual = dropHeaderAt(columns, header, insertAt as any).map(c => c.name);
		expect(actual).toEqual(expected);
	});

});
