import { ViewPlugin } from '@codemirror/view';
import createEditorControl from './testUtil/createEditorControl';

describe('CodeMirrorControl', () => {
	it('clearHistory should clear the undo/redo history', () => {
		const controls = createEditorControl('');

		const insertedText = 'Testing... This is a test...';
		controls.insertText(insertedText);

		const fullInsertedText = insertedText;
		expect(controls.getValue()).toBe(fullInsertedText);

		// Undo should work before clearing history
		controls.undo();
		expect(controls.getValue()).toBe('');

		controls.redo();
		controls.clearHistory();

		expect(controls.getValue()).toBe(fullInsertedText);

		// Should not be able to undo cleared changes
		controls.undo();
		expect(controls.getValue()).toBe(fullInsertedText);

		// Should be able to undo new changes
		controls.insertText('!!!');
		expect(controls.getValue()).toBe(`${fullInsertedText}!!!`);

		controls.undo();
		expect(controls.getValue()).toBe(fullInsertedText);
	});

	it('should support adding CodeMirror 6 extensions', () => {
		const control = createEditorControl('');

		const updateFn = jest.fn();
		control.addExtension([
			ViewPlugin.fromClass(class {
				public update = updateFn;
			}),
		]);

		// Verify that the extension has been loaded
		updateFn.mockReset();
		control.insertText('Test...');
		expect(updateFn).toHaveBeenCalled();
	});

	it('should support adding custom editor commands', () => {
		const control = createEditorControl('');
		const command = jest.fn(() => 'test');
		control.registerCommand('myTestCommand', command);

		expect(control.supportsCommand('myTestCommand')).toBe(true);
		expect(control.execCommand('myTestCommand')).toBe('test');
		expect(command).toHaveBeenCalledTimes(1);
	});

	it('toggleComment should work', () => {
		const control = createEditorControl('Hello\nWorld\n');
		control.select(1, 5);

		control.execCommand('toggleComment');
		expect(control.getValue()).toBe('<!-- Hello -->\nWorld\n');

		control.execCommand('toggleComment');
		expect(control.getValue()).toBe('Hello\nWorld\n');
	});

	it('deleteLine should work', () => {
		const control = createEditorControl('Hello\nWorld\n');
		control.setCursor(1, 0);

		control.execCommand('deleteLine');
		expect(control.getValue()).toBe('Hello\n');
	});
});
