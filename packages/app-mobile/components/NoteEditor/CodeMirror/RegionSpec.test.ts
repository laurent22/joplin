import RegionSpec from './RegionSpec';
import { Text as DocumentText, EditorSelection } from '@codemirror/state';

describe('Matching start/end of bolded regions', () => {
	const spec = new RegionSpec({
		templateStart: '**',
		templateStop: '**',
	});

	test('Match start of bolded', () => {
		const doc = DocumentText.of(['**test**']);
		const sel = EditorSelection.range(0, 5);

		// matchStart returns the length of the match
		expect(spec.matchStart(doc, sel)).toBe(2);
	});

	test('Match stop of bolded region (empty selection)', () => {
		const doc = DocumentText.of(['**...** test.']);
		const sel = EditorSelection.range(5, 5);
		expect(spec.matchStop(doc, sel)).toBe(2);
	});

	test('Region without a match', () => {
		const doc = DocumentText.of(['**...** test.']);
		const sel = EditorSelection.range(3, 3);
		expect(spec.matchStop(doc, sel)).toBe(-1);
	});
});

describe('Matching start/end of italicized regions', () => {
	const spec = new RegionSpec({
		templateStop: '*',
		templateStart: '*',
		startExp: /[*_]/g,
		stopExp: /[*_]/g,
	});

	describe('Matching the start/end of a specific test string', () => {
		const testString = 'This is a _test_';
		const testDoc = DocumentText.of([testString]);
		const fullSel = EditorSelection.range('This is a '.length, testString.length);

		test('matchStart (full selection)', () => {
			expect(spec.matchStart(testDoc, fullSel)).toBe(1);
		});

		test('matchStop (full selection)', () => {
			expect(spec.matchStop(testDoc, fullSel)).toBe(1);
		});
	});
});

// describe('')
//
// const testString = 'This is a _test_';
// const testSel = EditorSelection.range('This is a '.length, testString.length);
// failIfNeq(
//     spec.matchStart(DocumentText.of([testString]), testSel), 1,
//     'Italicized/matchStart (full selection) failed'
// );
// failIfNeq(
//     spec.matchStop(DocumentText.of([testString]), testSel), 1,
//     'Italicized/matchStop (full selection) failed'
// );

// spec = new RegionSpec({
//     templateStart: ' - ',
//     templateStop: '',
//     startBuffSize: 4,
//     startExp: /^\s*[-*]\s/g,
// });
// failIfNeq(
//     spec.matchStart(DocumentText.of(['- Test...']), EditorSelection.range(1, 6)), -1,
//     'List region spec/no matchStart (simple) failure!'
// );
// failIfNeq(
//     spec.matchStart(DocumentText.of(['- Test...']), EditorSelection.range(0, 6)), 2,
//     'List region spec/matchStart (simple) failure!'
// );
// failIfNeq(
//     spec.matchStart(DocumentText.of(['   - Test...']), EditorSelection.range(0, 6)), 5,
//     'List region spec/matchStart failure!'
// );
// failIfNeq(
//     spec.matchStop(DocumentText.of(['   - Test...']), EditorSelection.range(0, 100)), 0,
//     'List region spec/matchStop failure!'
// );
