import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import duplicateLine from './duplicateLine';

describe('duplicateLine', () => {
	it('should duplicate line', () => {
		const initialText = 'Hello\nWorld\n';
		const editorView = new EditorView({
			doc: initialText,
			selection: EditorSelection.cursor(0),
		});

		duplicateLine(editorView);

		const result = editorView.state.doc.toString();
		expect(result).toBe('Hello\nHello\nWorld\n');
	});

	it('should duplicate range', () => {
		const initialText = 'Hello\nWorld\n';
		const editorView = new EditorView({
			doc: initialText,
			selection: EditorSelection.range(0, 8),
		});

		duplicateLine(editorView);

		const result = editorView.state.doc.toString();
		expect(result).toBe('Hello\nWoHello\nWorld\n');
	});
});
