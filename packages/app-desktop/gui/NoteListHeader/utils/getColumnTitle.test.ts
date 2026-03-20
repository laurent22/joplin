import getColumnTitle from './getColumnTitle';
import { ColumnName } from '@joplin/lib/services/plugins/api/noteListType';

describe('getColumnTitle', () => {

	test.each<
	[name: ColumnName, expected: string]
	>([
		['note.checkboxes', 'Checkbox completion'],
		['note.is_todo', 'To-do'],
	])('returns expected title for %s', (name, expected) => {
		expect(getColumnTitle(name)).toBe(expected);
	});

});
