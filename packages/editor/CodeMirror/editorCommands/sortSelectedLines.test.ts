import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import sortSelectedLines from './sortSelectedLines';

describe('sortSelectedLines', () => {
	it('should sort selected lines', () => {
		const editorView = new EditorView({
			doc: 'World\nHello\n',
			selection: EditorSelection.range(0, 8),
		});

		sortSelectedLines(editorView);

		const result = editorView.state.doc.toString();
		expect(result).toBe('Hello\nWorld\n');
	});
});
