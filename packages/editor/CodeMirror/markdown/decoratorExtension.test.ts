import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testUtil/createTestEditor';
import decoratorExtension from './decoratorExtension';

jest.retryTimes(2);

describe('decoratorExtension', () => {
	it('should highlight code blocks within tables', async () => {
		// Regression test for https://github.com/laurent22/joplin/issues/9477
		const editorText = `
left    | right
--------|-------
\`foo\` | bar  
		`;
		const editor = await createTestEditor(
			editorText,

			// Put the initial cursor at the start of "foo"
			EditorSelection.cursor(editorText.indexOf('foo')),

			['TableRow', 'InlineCode'],
			[decoratorExtension],
		);

		const codeBlock = editor.contentDOM.querySelector('.cm-inlineCode');

		expect(codeBlock.textContent).toBe('`foo`');
		expect(codeBlock.parentElement.classList.contains('.cm-tableRow'));
	});
});
