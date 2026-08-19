import createTestEditor from '../../testing/createTestEditor';
import joplinEditablePlugin, { editSourceBlockAt, hideSourceBlockEditor } from './joplinEditablePlugin';
import { Second } from '@joplin/utils/time';
import { EditorView } from 'prosemirror-view';
import selectFirstInstanceOfNode from '../../utils/selectFirstInstanceOfNode';
import mockEditorApi from '../../testing/mockEditorApi';

const createEditor = (html: string) => {
	const editorApi = mockEditorApi();
	const editor = createTestEditor({
		plugins: [joplinEditablePlugin, editorApi.plugin],
		html,
	});
	editorApi.setup(editor);
	return editor;
};

const findEditButton = (editor: EditorView): HTMLButtonElement => {
	return editor.dom.parentElement.querySelector('.floating-button-bar:not(.-hidden) > .edit-button');
};

const findEditorDialog = () => {
	const dialog = document.querySelector('dialog.joplin-dialog');
	if (!dialog) {
		return null;
	}

	const editor = dialog.querySelector('textarea');
	const submitButton = dialog.querySelector('button');

	return {
		dialog,
		editor,
		submitButton,
	};
};

describe('joplinEditablePlugin', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		document.body.replaceChildren();
	});

	test.each([
		// Inline
		'<span class="joplin-editable"><pre class="joplin-source">test</pre>rendered</span>',
		// Block
		'<div class="joplin-editable"><pre class="joplin-source">test</pre>rendered</div>',
		// Nested inline
		'<p>Test: <mark><span class="joplin-editable"><pre class="joplin-source">test</pre>rendered</span></mark></p>',
	])('should show an edit button on source blocks (case %#)', (htmlSource) => {
		const editor = createEditor(htmlSource);

		selectFirstInstanceOfNode(editor, 'joplinEditableInline');
		selectFirstInstanceOfNode(editor, 'joplinEditableBlock');

		const editButton = findEditButton(editor);
		expect(editButton.textContent).toBe('Edit');
	});

	test('clicking the edit button should show an editor dialog', () => {
		const editor = createEditor('<span class="joplin-editable"><pre class="joplin-source">test source</pre>rendered</span>');
		selectFirstInstanceOfNode(editor, 'joplinEditableInline');

		const editButton = findEditButton(editor);
		editButton.click();

		// Should show the dialog
		const dialog = findEditorDialog();
		expect(dialog.editor).toBeTruthy();
		expect(dialog.submitButton).toBeTruthy();
	});

	test('editing the content of an editor dialog should update the source block', async () => {
		const editor = createEditor('<div class="joplin-editable"><pre class="joplin-source">test source</pre>rendered</div>');

		const editButton = findEditButton(editor);
		editButton.click();

		const dialog = findEditorDialog();
		dialog.editor.value = 'Updated!';
		dialog.editor.dispatchEvent(new Event('input'));

		// Should update the editor state with the new source immediately.
		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				type: 'joplinEditableBlock',
				attrs: {
					source: 'Updated!',
				},
			}],
		});

		// Should render and update the display within a short amount of time
		await jest.advanceTimersByTimeAsync(Second);
		const renderedEditable = editor.dom.querySelector('.joplin-editable');
		// Should render the updated content
		expect(renderedEditable.querySelector('.test-content').innerHTML).toBe('Mocked!');
	});

	test('should make #hash links clickable', () => {
		const editor = createEditor(`
			<div class="joplin-editable">
				<a href="#test-heading-1">Test</a>
				<a href="#test-heading-2">Test</a>
			</div>
			<h1>Test heading 1</h1>
			<h1>Test heading 2</h1>
		`);
		const hashLinks = editor.dom.querySelectorAll<HTMLAnchorElement>('a[href^="#test"]');

		hashLinks[0].click();
		expect(editor.state.selection.$from.parent.textContent).toBe('Test heading 1');

		hashLinks[1].click();
		expect(editor.state.selection.$from.parent.textContent).toBe('Test heading 2');
	});

	test('should support toggling the editor dialog externally', () => {
		const editor = createEditor('<div class="joplin-editable"><pre class="joplin-source">test source</pre>rendered</div>');
		editSourceBlockAt(0)(editor.state, editor.dispatch, editor);

		const dialog = findEditorDialog();
		expect(dialog.editor).toBeTruthy();

		hideSourceBlockEditor(editor.state, editor.dispatch, editor);
		expect(findEditorDialog()).toBeNull();
	});
});
