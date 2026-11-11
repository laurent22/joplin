import { EditorSelection, Text } from '@codemirror/state';
import clampSelectionToDocument from './clampSelectionToDocument';

describe('clampSelectionToDocument', () => {
	it('should clamp a selection to the document', () => {
		const doc = Text.of(['Testing...']);
		const end = 'Testing...'.length;

		expect(clampSelectionToDocument(
			EditorSelection.single(end + 1), doc,
		)).toMatchObject({
			main: { from: end, to: end },
		});

		// Should map multiple at once
		expect(clampSelectionToDocument(
			EditorSelection.create([
				EditorSelection.range(-1, 0),
				EditorSelection.cursor(1),
				EditorSelection.cursor(100),
			], 2), doc,
		)).toMatchObject({
			ranges: [
				{ from: 0, to: 0 },
				{ from: 1, to: 1 },
				{ from: end, to: end },
			],
			mainIndex: 2,
		});
	});

	it('should not change a selection within the document', () => {
		const doc = Text.of(['Test']);

		// Should return the exact same selection
		const selection = EditorSelection.single('Te'.length);
		expect(clampSelectionToDocument(selection, doc)).toBe(selection);
	});
});
