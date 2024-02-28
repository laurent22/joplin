import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import swapLine from './swapLine';


describe('swapLine', () => {
	it('should swap line down', () => {
		const initialText = 'Hello\nWorld\nJoplin\n';
		const editorView = new EditorView({
			doc: initialText,
			selection: EditorSelection.cursor(0),
		});

		swapLine(1)(editorView);

		const result = editorView.state.doc.toString();
		expect(result).toBe('World\nHello\nJoplin\n');
	});

	it('should swap line up', () => {
		const initialText = 'Hello\nWorld\nJoplin\n';
		const editorView = new EditorView({
			doc: initialText,
			selection: EditorSelection.cursor(6),
		});

		swapLine(-1)(editorView);

		const result = editorView.state.doc.toString();
		expect(result).toBe('World\nHello\nJoplin\n');
	});
});
