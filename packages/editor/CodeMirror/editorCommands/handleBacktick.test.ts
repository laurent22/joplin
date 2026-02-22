import { EditorSelection, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import createTestEditor from '../testing/createTestEditor';
import pressReleaseKey from '../testing/pressReleaseKey';
import handleBacktick from './handleBacktick';

const backtickKey = { key: '`', code: 'Backquote', typesText: '`' };

describe('handleBacktick', () => {
	jest.retryTimes(2);

	it.each([
		{
			initialText: '',
			cursorPos: 0,
			afterOnePress: '``',
			expectedCursorPos: 1,
		},
		{
			initialText: '``',
			cursorPos: 1,
			afterOnePress: '``',
			expectedCursorPos: 2,
		},
		{
			initialText: '``',
			cursorPos: 2,
			afterOnePress: '```',
			expectedCursorPos: 3,
		},
		{
			initialText: '```sql\ncode\n``',
			cursorPos: 14,
			afterOnePress: '```sql\ncode\n```',
			expectedCursorPos: 15,
		},
	])('should handle backtick correctly (case %#)', async ({ initialText, cursorPos, afterOnePress, expectedCursorPos }) => {
		const editor = await createTestEditor(
			initialText,
			EditorSelection.cursor(cursorPos),
			[],
			[Prec.high(keymap.of([{ key: '`', run: handleBacktick }]))],
			false,
		);

		pressReleaseKey(editor, backtickKey);

		expect(editor.state.doc.toString()).toBe(afterOnePress);
		expect(editor.state.selection.main.from).toBe(expectedCursorPos);
	});

	it('should not handle key when text is selected', async () => {
		const editor = await createTestEditor(
			'hello',
			EditorSelection.range(0, 5),
			[],
			[Prec.high(keymap.of([{ key: '`', run: handleBacktick }]))],
			false,
		);

		pressReleaseKey(editor, backtickKey);

		expect(editor.state.selection.main.from).toBe(editor.state.selection.main.to);
	});

	it('should produce correct result when pressing backtick three times in sequence', async () => {
		const editor = await createTestEditor(
			'',
			EditorSelection.cursor(0),
			[],
			[Prec.high(keymap.of([{ key: '`', run: handleBacktick }]))],
			false,
		);

		pressReleaseKey(editor, backtickKey);
		expect(editor.state.doc.toString()).toBe('``');
		expect(editor.state.selection.main.from).toBe(1);

		pressReleaseKey(editor, backtickKey);
		expect(editor.state.doc.toString()).toBe('``');
		expect(editor.state.selection.main.from).toBe(2);

		pressReleaseKey(editor, backtickKey);
		expect(editor.state.doc.toString()).toBe('```');
		expect(editor.state.selection.main.from).toBe(3);
	});
});
