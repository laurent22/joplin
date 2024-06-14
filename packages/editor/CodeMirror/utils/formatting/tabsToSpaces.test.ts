import { indentUnit } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import tabsToSpaces from './tabsToSpaces';


describe('tabsToSpaces', () => {
	it('should convert tabs to spaces based on indentUnit', () => {
		const state: EditorState = EditorState.create({
			doc: 'This is a test.',
			selection: EditorSelection.cursor(0),
			extensions: [
				indentUnit.of('    '),
			],
		});
		expect(tabsToSpaces(state, '\t')).toBe('    ');
		expect(tabsToSpaces(state, '\t  ')).toBe('      ');
		expect(tabsToSpaces(state, '  \t  ')).toBe('      ');
	});
});
