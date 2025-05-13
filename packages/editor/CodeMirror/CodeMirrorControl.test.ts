import { ViewPlugin } from '@codemirror/view';
import createEditorControl from './testUtil/createEditorControl';
import { EditorCommandType } from '../types';
import pressReleaseKey from './testUtil/pressReleaseKey';
import { EditorSelection, EditorState } from '@codemirror/state';

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

	it.each([
		{
			before: 'Test',
			selection: EditorSelection.range(0, 4),
			shortcut: { key: 'i', code: 'KeyI', ctrlKey: true },
			expected: '*Test*',
		},
		{
			before: 'Test',
			selection: EditorSelection.range(0, 4),
			shortcut: { key: 'b', code: 'KeyB', ctrlKey: true },
			expected: '**Test**',
		},
		{
			before: 'Testing',
			selection: EditorSelection.range(0, 4),
			shortcut: { key: 'b', code: 'KeyB', ctrlKey: true },
			expected: '**Test**ing',
		},
	])('markdown keyboard shortcuts should work (case %#)', ({ before, selection, shortcut, expected }) => {
		const control = createEditorControl(before);
		control.select(selection.anchor, selection.head);

		pressReleaseKey(control.editor, shortcut);
		expect(control.getValue()).toBe(expected);
	});

	it('should support overriding default keybindings', () => {
		const control = createEditorControl('test');
		control.execCommand(EditorCommandType.SelectAll);

		const testCommand = jest.fn(() => true);
		const keybindings = control.prependKeymap([
			// Override the default binding for ctrl-d (search)
			{ key: 'Ctrl-d', run: testCommand },
		]);

		// Should call the override command rather than the default handler
		const keyData = {
			key: 'd',
			code: 'KeyD',
			ctrlKey: true,
		};
		pressReleaseKey(control.editor, keyData);
		expect(testCommand).toHaveBeenCalledTimes(1);

		// Calling keybindings.remove should deregister the override.
		keybindings.remove();
		pressReleaseKey(control.editor, keyData);
		expect(testCommand).toHaveBeenCalledTimes(1);
	});

	it('should toggle comments', () => {
		const control = createEditorControl('Hello\nWorld\n');
		control.select(1, 5);

		control.execCommand('toggleComment');
		expect(control.getValue()).toBe('<!-- Hello -->\nWorld\n');

		control.execCommand('toggleComment');
		expect(control.getValue()).toBe('Hello\nWorld\n');
	});

	it('should delete line', () => {
		const control = createEditorControl('Hello\nWorld\n');
		control.setCursor(1, 0);

		control.execCommand('deleteLine');
		expect(control.getValue()).toBe('Hello\n');
	});

	it('should replace the editor body in a document with CRLF', () => {
		const initialContent = 'Hello\r\nWorld\r\na';
		const control = createEditorControl(initialContent);
		control.setCursor(1, initialContent.length);

		control.updateBody('Hello\r\nWorld\r\n');
		control.updateBody('Hello\r\nWorld\r\ntest');
		control.updateBody('Hello\r\n');
	});

	it.each([
		{
			initialText: 'Hello\nWorld',
			selection: EditorSelection.cursor(5),
			left: '[[',
			right: ']].',
			typeText: null,
			expected: 'Hello[[]].\nWorld',
		},
		{
			initialText: 'Hello\nWorld',
			selection: EditorSelection.cursor(0),
			left: 'before',
			right: 'after.',
			typeText: ' cursor ',
			expected: 'before cursor after.Hello\nWorld',
		},
		{
			initialText: 'Hello\nWorld',
			selection: EditorSelection.range(0, 5),
			left: '[',
			right: '](test)',
			typeText: null,
			expected: '[Hello](test)\nWorld',
		},
		{
			initialText: 'Hello\nWorld',
			selection: EditorSelection.range(0, 5),
			left: '[',
			right: '](test)',
			typeText: 'replaced',
			expected: '[replaced](test)\nWorld',
		},
		{
			initialText: 'Hello\nWorld',
			selection: EditorSelection.create([
				EditorSelection.cursor(0), EditorSelection.cursor(5),
			]),
			left: '[',
			right: '](test)',
			typeText: 'cursor',
			expected: '[cursor](test)Hello[cursor](test)\nWorld',
		},
		{
			initialText: 'This is a\ntest',
			selection: EditorSelection.create([
				EditorSelection.range(5, 9), EditorSelection.cursor(14),
			]),
			left: '[',
			right: ']',
			typeText: 'cursor',
			expected: 'This [cursor]\ntest[cursor]',
		},
	])('wrapSelections should surround all selections with the given text (case %#)', ({ initialText, selection, typeText, left, right, expected }) => {
		const control = createEditorControl(initialText);
		control.editor.dispatch({
			selection,
		});
		control.wrapSelections(left, right);

		if (typeText) {
			control.insertText(typeText);
		}

		expect(control.editor.state.doc.toString()).toBe(expected);
	});

	it('updateBody should update the note ID facet and dispatch changes', () => {
		const control = createEditorControl('test');
		const noteIdFacet = control.joplinExtensions.noteIdFacet;
		const getFacet = () => control.editor.state.facet(noteIdFacet);

		control.updateBody('Test', { noteId: 'updated' });
		expect(getFacet()).toBe('updated');

		// Updating the ID without updating the body should change the ID
		control.updateBody('Test', { noteId: 'updated 2' });
		expect(getFacet()).toBe('updated 2');

		// Changing the body, without specifying a new note ID, should
		// not update the facet.
		control.updateBody('Test 2');
		expect(getFacet()).toBe('updated 2');
	});

	it('updateBody should dispatch changes to the note ID', () => {
		const control = createEditorControl('test');

		let noteId = '';
		const noteIdChangeListener = EditorState.transactionExtender.of(transaction => {
			for (const effect of transaction.effects) {
				if (effect.is(control.joplinExtensions.setNoteIdEffect)) {
					noteId = effect.value;
				}
			}
			return null;
		});
		control.addExtension(noteIdChangeListener);

		control.updateBody('Test', { noteId: 'updated' });
		expect(noteId).toBe('updated');

		control.updateBody('Test', { noteId: 'updated-2' });
		expect(noteId).toBe('updated-2');
	});
});
