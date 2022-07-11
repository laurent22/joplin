import {
	findInlineMatch, MatchSide, RegionSpec, tabsToSpaces, toggleRegionFormatGlobally,
} from './markdownReformatter';
import { Text as DocumentText, EditorSelection, EditorState } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';

describe('Matching', () => {
	describe('Matching start/end of bolded regions', () => {
		const spec: RegionSpec = RegionSpec.of({
			template: '**',
		});

		it('Match start of bolded', () => {
			const doc = DocumentText.of(['**test**']);
			const sel = EditorSelection.range(0, 5);

			// matchStart returns the length of the match
			expect(findInlineMatch(doc, spec, sel, MatchSide.Start)).toBe(2);
		});

		it('Match end of bolded region (empty selection)', () => {
			const doc = DocumentText.of(['**...** test.']);
			const sel = EditorSelection.range(5, 5);
			expect(findInlineMatch(doc, spec, sel, MatchSide.End)).toBe(2);
		});

		it('Region without a match', () => {
			const doc = DocumentText.of(['**...** test.']);
			const sel = EditorSelection.range(3, 3);
			expect(findInlineMatch(doc, spec, sel, MatchSide.Start)).toBe(-1);
		});
	});

	describe('Matching start/end of italicized regions', () => {
		const spec: RegionSpec = {
			template: { start: '*', end: '*' },
			matcher: { start: /[*_]/g, end: /[*_]/g },
		};

		describe('Matching the start/end of a specific test string', () => {
			const testString = 'This is a _test_';
			const testDoc = DocumentText.of([testString]);
			const fullSel = EditorSelection.range('This is a '.length, testString.length);

			it('match start (full selection)', () => {
				expect(findInlineMatch(testDoc, spec, fullSel, MatchSide.Start)).toBe(1);
			});

			it('match end (full selection)', () => {
				expect(findInlineMatch(testDoc, spec, fullSel, MatchSide.End)).toBe(1);
			});
		});
	});

	describe('List matching start/stop', () => {
		const spec: RegionSpec = {
			template: { start: ' - ', end: '' },
			matcher: {
				start: /^\s*[-*]\s/g,
				end: /$/g,

				// Ensure there's enough space to do the match
				bufferSize: 4
			},
		};

		it('Don\'t match start of list (not fully selected)', () => {
			const doc = DocumentText.of(['- Test...']);
			const sel = EditorSelection.range(1, 6);

			// Beginning of list not selected: no match
			expect(findInlineMatch(doc, spec, sel, MatchSide.Start)).toBe(-1);
		});

		it('Match start of list', () => {
			const doc = DocumentText.of(['- Test...']);
			const sel = EditorSelection.range(0, 6);

			expect(findInlineMatch(doc, spec, sel, MatchSide.Start)).toBe(2);
		});

		it('Match start of indented list', () => {
			const doc = DocumentText.of(['   - Test...']);
			const sel = EditorSelection.range(0, 6);

			expect(findInlineMatch(doc, spec, sel, MatchSide.Start)).toBe(5);
		});

		it('Match end of indented list', () => {
			const doc = DocumentText.of(['   - Test...']);
			const sel = EditorSelection.range(0, 6);

			// Zero-length, but found, selection
			expect(findInlineMatch(doc, spec, sel, MatchSide.End)).toBe(0);
		});
	});
});

describe('Text manipulation', () => {
	const initialText = `Internal text manipulation
		This is a test...
		of block and inline region toggling.`;
	const codeFenceRegex = /^``````\w*\s*$/;
	const inlineCodeRegionSpec = RegionSpec.of({
		template: '`', 
		nodeName: 'InlineCode'
	});
	const blockCodeRegionSpec: RegionSpec = {
		template: { start: '``````', end: '``````' },
		matcher: { start: codeFenceRegex, end: codeFenceRegex, },
	};

	it('Toggle inline region format', () => {
		const initialState: EditorState = EditorState.create({
			doc: initialText,
			selection: EditorSelection.cursor(0),
		});

		const changes = toggleRegionFormatGlobally(
			initialState, inlineCodeRegionSpec, blockCodeRegionSpec,
		);

		const newState = initialState.update(changes).state;
		expect(newState.doc.toString()).toEqual(`\`\`${initialText}`);
	});

	it('Toggle block region format', () => {
		const initialState: EditorState = EditorState.create({
			doc: initialText,
			selection: EditorSelection.range(0, initialText.length),
		});

		const changes = toggleRegionFormatGlobally(
			initialState, inlineCodeRegionSpec, blockCodeRegionSpec,
		);

		const newState = initialState.update(changes).state;
		const editorText = newState.doc.toString();
		expect(editorText).toBe(`\`\`\`\`\`\`\n${initialText}\n\`\`\`\`\`\``);
		expect(newState.selection.main.from).toBe(0);
		expect(newState.selection.main.to).toBe(editorText.length);
	});

	it('Tabs to spaces', () => {
		const state: EditorState = EditorState.create({
			doc: initialText,
			selection: EditorSelection.cursor(0),
			extensions: [
				indentUnit.of('    '),
			],
		});
		expect(tabsToSpaces(state, '\t')).toBe('    ');
		expect(tabsToSpaces(state, '\t  ')).toBe('      ');
		expect(tabsToSpaces(state, '  \t  ')).toBe('      ');
	});
});
