import getColumnTitle from './getColumnTitle';
import { ColumnName } from '@joplin/lib/services/plugins/api/noteListType';

describe('getColumnTitle', () => {

	test.each<
	[name: ColumnName, forHeader: boolean, expected: string]
	>([
		['note.checkboxes', true, getColumnTitle('note.checkboxes')],
		['note.checkboxes', false, getColumnTitle('note.checkboxes')],
		['note.is_todo', true, '✓'],
	])('returns expected title for %s (forHeader=%s)', (name, forHeader, expected) => {
		expect(getColumnTitle(name, forHeader)).toBe(expected);
	});

	test('does not render checkbox header as half-circle icon', () => {
		expect(getColumnTitle('note.checkboxes', true)).not.toBe('◐');
	});

});
