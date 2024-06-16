import { EditorSelection, EditorState } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import toggleRegionFormatGlobally from './toggleRegionFormatGlobally';

describe('toggleRegionFormatGlobally', () => {
	jest.retryTimes(2);

	const multiLineTestText = `Internal text manipulation
		This is a test...
		of block and inline region toggling.`;
	const codeFenceRegex = /^``````\w*\s*$/;
	const inlineCodeRegionSpec = RegionSpec.of({
		template: '`',
		nodeName: 'InlineCode',
	});
	const blockCodeRegionSpec: RegionSpec = {
		template: { start: '``````', end: '``````' },
		matcher: { start: codeFenceRegex, end: codeFenceRegex },
	};

	it('should create an empty inline region around the cursor, if given an empty selection', () => {
		const initialState: EditorState = EditorState.create({
			doc: multiLineTestText,
			selection: EditorSelection.cursor(0),
		});

		const changes = toggleRegionFormatGlobally(
			initialState, inlineCodeRegionSpec, blockCodeRegionSpec,
		);

		const newState = initialState.update(changes).state;
		expect(newState.doc.toString()).toEqual(`\`\`${multiLineTestText}`);
	});

	it('should wrap multiple selected lines in block formatting', () => {
		const initialState: EditorState = EditorState.create({
			doc: multiLineTestText,
			selection: EditorSelection.range(0, multiLineTestText.length),
		});

		const changes = toggleRegionFormatGlobally(
			initialState, inlineCodeRegionSpec, blockCodeRegionSpec,
		);

		const newState = initialState.update(changes).state;
		const editorText = newState.doc.toString();
		expect(editorText).toBe(`\`\`\`\`\`\`\n${multiLineTestText}\n\`\`\`\`\`\``);
		expect(newState.selection.main.from).toBe(0);
		expect(newState.selection.main.to).toBe(editorText.length);
	});
});

