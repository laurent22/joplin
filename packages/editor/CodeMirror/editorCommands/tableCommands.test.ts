import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testing/createTestEditor';
import { getTableRangeAtCursor, getCellAtCursor } from './tableCommands';

describe('tableCommands', () => {

	it('should resolve correct column in table with outer pipes', async () => {
		const doc = '| A | B |\n|---|---|\n| 1 | 2 |';
		// Place cursor on "2"
		const cursorPos = doc.indexOf('2');
		const editor = await createTestEditor(doc, EditorSelection.cursor(cursorPos), ['Table']);

		const tableRange = getTableRangeAtCursor(editor.state);
		expect(tableRange).not.toBeNull();

		const cell = getCellAtCursor(editor.state, tableRange!);
		expect(cell).not.toBeNull();
		expect(cell!.row).toBe(1); // body row 0 → row 1
		expect(cell!.col).toBe(1); // second column
	});

	it('should resolve correct column in table without outer pipes', async () => {
		const doc = 'A | B\n---|---\n1 | 2';
		// Place cursor on "2"
		const cursorPos = doc.indexOf('2');
		const editor = await createTestEditor(doc, EditorSelection.cursor(cursorPos), ['Table']);

		const tableRange = getTableRangeAtCursor(editor.state);
		expect(tableRange).not.toBeNull();

		const cell = getCellAtCursor(editor.state, tableRange!);
		expect(cell).not.toBeNull();
		expect(cell!.row).toBe(1); // body row 0 → row 1
		expect(cell!.col).toBe(1); // second column
	});

	it('should resolve first column correctly in table without outer pipes', async () => {
		const doc = 'A | B\n---|---\n1 | 2';
		// Place cursor on "1"
		const cursorPos = doc.indexOf('1');
		const editor = await createTestEditor(doc, EditorSelection.cursor(cursorPos), ['Table']);

		const tableRange = getTableRangeAtCursor(editor.state);
		expect(tableRange).not.toBeNull();

		const cell = getCellAtCursor(editor.state, tableRange!);
		expect(cell).not.toBeNull();
		expect(cell!.row).toBe(1);
		expect(cell!.col).toBe(0); // first column
	});
});
