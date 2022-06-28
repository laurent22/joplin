import RegionSpec from './RegionSpec';
import { Text as DocumentText, EditorSelection } from '@codemirror/state';

describe('Matching start/end of bolded regions', () => {
	const spec = new RegionSpec({
		templateStart: '**',
		templateStop: '**',
	});

	it('Match start of bolded', () => {
		const doc = DocumentText.of(['**test**']);
		const sel = EditorSelection.range(0, 5);

		// matchStart returns the length of the match
		expect(spec.matchStart(doc, sel)).toBe(2);
	});

	it('Match stop of bolded region (empty selection)', () => {
		const doc = DocumentText.of(['**...** test.']);
		const sel = EditorSelection.range(5, 5);
		expect(spec.matchStop(doc, sel)).toBe(2);
	});

	it('Region without a match', () => {
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

		it('matchStart (full selection)', () => {
			expect(spec.matchStart(testDoc, fullSel)).toBe(1);
		});

		it('matchStop (full selection)', () => {
			expect(spec.matchStop(testDoc, fullSel)).toBe(1);
		});
	});
});

describe('List matching start/stop', () => {
	const spec = new RegionSpec({
		templateStart: ' - ',
		templateStop: '',
		startBuffSize: 4,
		startExp: /^\s*[-*]\s/g,
	});

	it('Don\'t match start of list (not fully selected)', () => {
		const doc = DocumentText.of(['- Test...']);
		const sel = EditorSelection.range(1, 6);

		// Beginning of list not selected: no match
		expect(spec.matchStart(doc, sel)).toBe(-1);
	});

	it('Match start of list', () => {
		const doc = DocumentText.of(['- Test...']);
		const sel = EditorSelection.range(0, 6);

		expect(spec.matchStart(doc, sel)).toBe(2);
	});

	it('Match start of indented list', () => {
		const doc = DocumentText.of(['   - Test...']);
		const sel = EditorSelection.range(0, 6);

		expect(spec.matchStart(doc, sel)).toBe(5);
	});

	it('Match end of indented list', () => {
		const doc = DocumentText.of(['   - Test...']);
		const sel = EditorSelection.range(0, 6);

		// Zero-length, but found, selection
		expect(spec.matchStop(doc, sel)).toBe(0);
	});
});
