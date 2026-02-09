import { EditorView } from 'prosemirror-view';
import { EditorCommandType } from '../../types';
import commands from './commands';
import createTestEditor from '../testing/createTestEditor';
import selectDocumentEnd from './selectDocumentEnd';

const selectAll = (editor: EditorView) => {
	commands[EditorCommandType.SelectAll](editor.state, editor.dispatch, editor);
};

const moveCursorToEnd = (editor: EditorView) => {
	selectDocumentEnd(editor.state, editor.dispatch, editor);
};

describe('ProseMirror/commands', () => {
	test('textBold should toggle bold formatting', () => {
		const editor = createTestEditor({ html: '<p>Test</p>' });

		selectAll(editor);
		commands[EditorCommandType.ToggleBolded](editor.state, editor.dispatch, editor);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				type: 'paragraph',
				content: [{
					marks: [
						{ type: 'strong' },
					],
					text: 'Test',
				}],
			}],
		});
	});

	test('toggleHeading should add and remove header formatting', () => {
		const editor = createTestEditor({ html: '<p>Test</p><p>Test 2</p>' });

		selectAll(editor);
		commands[EditorCommandType.ToggleHeading](editor.state, editor.dispatch, editor);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				type: 'heading',
				content: [{
					text: 'Test',
				}],
			}, {
				type: 'heading',
				content: [{
					text: 'Test 2',
				}],
			}],
		});

		commands[EditorCommandType.ToggleHeading](editor.state, editor.dispatch, editor);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				type: 'paragraph',
				content: [{
					text: 'Test',
				}],
			}, {
				type: 'paragraph',
				content: [{
					text: 'Test 2',
				}],
			}],
		});
	});

	test('jumpToHash should scroll to a heading with a matching hash', () => {
		const editor = createTestEditor({ html: '<h1>Test heading 1</h1><p>Test 2</p><h2>Test heading 2</h2><p>Test 3</p>' });

		const jumpToHash = (hash: string) => {
			return commands[EditorCommandType.JumpToHash](editor.state, editor.dispatch, editor, [hash]);
		};

		expect(jumpToHash('test-heading-1')).toBe(true);
		expect(editor.state.selection.$anchor.parent.textContent).toBe('Test heading 1');

		expect(jumpToHash('test-heading-2')).toBe(true);
		expect(editor.state.selection.$anchor.parent.textContent).toBe('Test heading 2');
	});

	test('textTable should insert a table', () => {
		const editor = createTestEditor({ html: '<p></p>' });

		commands[EditorCommandType.InsertTable](editor.state, editor.dispatch, editor);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				content: [
					{ type: 'table_row' },
					{ type: 'table_row' },
				],
				type: 'table',
			}],
		});
	});

	test.each([
		{
			label: 'should indent the selected paragraph',
			before: '<p>Test</p>',
			select: selectAll,
			expectedDoc: [
				{ type: 'paragraph', content: [{ type: 'text', text: '    Test' }] },
			],
		},
		{
			label: 'should not throw an error if the selection is at the end of the document (after the last block)',
			before: '<p>Test</p><p>Test 2</p>',
			select: moveCursorToEnd,
			expectedDoc: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Test 2' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: '    ' }] },
			],
		},
	])('indentMore should add spaces to the beginning of the selected lines ($label)', ({ before, select, expectedDoc }) => {
		const editor = createTestEditor({ html: before });
		select(editor);

		commands[EditorCommandType.IndentMore](editor.state, editor.dispatch, editor);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: expectedDoc,
		});
	});

	test('indentLess should remove spaces from the beginning of the line', () => {
		const editor = createTestEditor({ html: '<p>    test</p>' });
		selectAll(editor);

		commands[EditorCommandType.IndentLess](editor.state, editor.dispatch, editor);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				content: [
					{ type: 'text', text: 'test' },
				],
				type: 'paragraph',
			}],
		});
	});
});
