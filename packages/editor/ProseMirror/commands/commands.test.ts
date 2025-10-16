import { EditorView } from 'prosemirror-view';
import { EditorCommandType } from '../../types';
import commands from './commands';
import createTestEditor from '../testing/createTestEditor';

const selectAll = (editor: EditorView) => {
	commands[EditorCommandType.SelectAll](editor.state, editor.dispatch, editor);
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
});
