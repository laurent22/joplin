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
});
