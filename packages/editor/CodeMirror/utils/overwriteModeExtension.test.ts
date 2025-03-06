import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testUtil/createTestEditor';
import overwriteModeExtension, { overwriteModeEnabled, toggleOverwrite } from './overwriteModeExtension';
import typeText from '../testUtil/typeText';
import pressReleaseKey from '../testUtil/pressReleaseKey';

const createEditor = async (initialText: string, defaultEnabled = false) => {
	const editor = await createTestEditor(initialText, EditorSelection.cursor(0), [], [
		overwriteModeExtension,
	]);

	if (defaultEnabled) {
		editor.dispatch({ effects: [toggleOverwrite.of(true)] });
	}

	return editor;
};

describe('overwriteModeExtension', () => {
	test('should be disabled by default', async () => {
		const editor = await createEditor('Test!');

		typeText(editor, 'This should be inserted. ');
		expect(editor.state.doc.toString()).toBe('This should be inserted. Test!');
	});

	test('should overwrite characters while typing', async () => {
		const editor = await createEditor('Test!', true);

		pressReleaseKey(editor, { key: 'A', code: 'KeyA' });
		typeText(editor, 'New');
		expect(editor.state.doc.toString()).toBe('Newt!');
	});

	test('should be toggled by pressing <insert>', async () => {
		const editor = await createEditor('Test!');

		pressReleaseKey(editor, { key: 'Insert', code: 'Insert' });
		expect(overwriteModeEnabled(editor)).toBe(true);

		typeText(editor, 'Exam');
		expect(editor.state.doc.toString()).toBe('Exam!');

		pressReleaseKey(editor, { key: 'Insert', code: 'Insert' });
		typeText(editor, 'ple');
		expect(editor.state.doc.toString()).toBe('Example!');
	});

	test('should be disabled by pressing <escape>', async () => {
		const editor = await createEditor('Test!', true);

		expect(overwriteModeEnabled(editor)).toBe(true);
		pressReleaseKey(editor, { key: 'Escape', code: 'Escape' });
		expect(overwriteModeEnabled(editor)).toBe(false);
		// Escape should not re-enable the extension
		pressReleaseKey(editor, { key: 'Escape', code: 'Escape' });
		expect(overwriteModeEnabled(editor)).toBe(false);
	});

	test('<insert> should not toggle overwrite mode if other keys are pressed', async () => {
		// On Linux, the Orca screen reader's default "do screen reader action" key is
		// <insert>. To avoid toggling insert mode when users perform screen reader actions,
		// pressing <insert> should only toggle insert mode in certain cases.
		const editor = await createEditor('Test');
		const insertKey = { code: 'Insert', key: 'Insert ' };

		editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', insertKey));
		expect(overwriteModeEnabled(editor)).toBe(false);

		// Pressing & releasing the space key should prevent insert mode from being enabled
		pressReleaseKey(editor, { code: 'Space', key: 'Space' });

		editor.contentDOM.dispatchEvent(new KeyboardEvent('keyup', insertKey));

		expect(overwriteModeEnabled(editor)).toBe(false);
	});

	test('should insert text if the cursor is at the end of a line', async () => {
		const editor = await createEditor('\nTest', true);
		typeText(editor, 'Test! This is a test! ');
		typeText(editor, 't');
		typeText(editor, 'e');
		typeText(editor, 's');
		typeText(editor, 't');

		expect(editor.state.doc.toString()).toBe('Test! This is a test! test\nTest');
	});
});
