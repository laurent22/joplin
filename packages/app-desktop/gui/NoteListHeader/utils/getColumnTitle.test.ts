import getColumnTitle from './getColumnTitle';
import { ColumnName } from '@joplin/lib/services/plugins/api/noteListType';

describe('getColumnTitle', () => {

	test.each<
	[name: ColumnName, forHeader: boolean, expected: string]
	>([
		['note.checkboxes', true, 'Progress'],
		['note.checkboxes', false, 'Progress'],
		['note.is_todo', true, 'To-do'],
	])('returns expected title for %s (forHeader=%s)', (name, forHeader, expected) => {
		expect(getColumnTitle(name, forHeader)).toBe(expected);
	});

});
