import { NoteListColumns, defaultListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import validateColumns from './validateColumns';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const makeColumns = (props: any) => {
	const columns: NoteListColumns = [];
	for (const p of props) {
		columns.push({
			name: 'note.title',
			width: 100,
			...p,
		});
	}
	return columns;
};

describe('validateColumns', () => {

	test.each([
		[
			[{ width: 100 }, { width: 200 }, { width: 0 }],
			[{ width: 100 }, { width: 200 }, { width: 0 }],
		],
		[
			[{ width: 100 }, { width: 200 }, { width: 100 }],
			[{ width: 100 }, { width: 200 }, { width: 0 }],
		],
		[
			[{ width: 0 }, { width: 0 }, { width: 100 }],
			[{ width: 100 }, { width: 100 }, { width: 0 }],
		],
		[
			[],
			defaultListColumns(),
		],
		[
			null,
			defaultListColumns(),
		],
	])('should drop columns', (columnProps, expectedProps) => {
		const columns = columnProps ? makeColumns(columnProps) : columnProps;
		const expected = makeColumns(expectedProps);

		const actual = validateColumns(columns);
		expect(actual).toEqual(expected);

		const mustBeIdentical = JSON.stringify(columns) === JSON.stringify(expected);

		expect(actual === columns).toBe(mustBeIdentical);
	});

});
