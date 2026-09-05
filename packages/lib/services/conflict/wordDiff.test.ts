import { wordDiff, WordDiffSegment } from './wordDiff';

const highlightedText = (segments: WordDiffSegment[]) => {
	return segments.filter(s => s.highlighted).map(s => s.text);
};

const joined = (segments: WordDiffSegment[]) => {
	return segments.map(s => s.text).join('');
};

describe('wordDiff', () => {

	test('should return a single unhighlighted segment per side when the texts match', () => {
		const diff = wordDiff('same text', 'same text');
		expect(diff.local).toEqual([{ text: 'same text', highlighted: false }]);
		expect(diff.remote).toEqual([{ text: 'same text', highlighted: false }]);
	});

	test('should highlight only the words that differ', () => {
		const diff = wordDiff('the quick brown fox', 'the quick red fox');
		expect(highlightedText(diff.local)).toEqual(['brown']);
		expect(highlightedText(diff.remote)).toEqual(['red']);
	});

	// cSpell:disable
	test('should highlight the whole word when a single character differs', () => {
		const diff = wordDiff('these are similar words', 'these are similer words');
		expect(highlightedText(diff.local)).toEqual(['similar']);
		expect(highlightedText(diff.remote)).toEqual(['similer']);
	});
	// cSpell:enable

	test.each([
		['word added on remote', 'one two', 'one extra two', [], ['extra ']],
		['word removed on remote', 'one extra two', 'one two', ['extra '], []],
		['punctuation change highlights only the mark', 'the end.', 'the end!', ['.'], ['!']],
		['fully different texts', 'mine', 'theirs', ['mine'], ['theirs']],
	])('%s', (_label, local, remote, expectedLocal, expectedRemote) => {
		const diff = wordDiff(local, remote);
		expect(highlightedText(diff.local)).toEqual(expectedLocal);
		expect(highlightedText(diff.remote)).toEqual(expectedRemote);
	});

	test('should not pair identical words that sit on different lines', () => {
		const diff = wordDiff('hello - found\nworld', 'hello\nworld - jop');

		expect(highlightedText(diff.local)).toEqual([' - found']);
		expect(highlightedText(diff.remote)).toEqual([' - jop']);
		expect(joined(diff.local)).toBe('hello - found\nworld');
		expect(joined(diff.remote)).toBe('hello\nworld - jop');
	});

	test('should not pair words across lines when the sides have different line counts', () => {
		const diff = wordDiff('hello - found\nworld', 'hello\nworld - jop\n');

		expect(highlightedText(diff.local)).toEqual([' - found']);
		expect(highlightedText(diff.remote)).toEqual([' - jop']);
		expect(joined(diff.local)).toBe('hello - found\nworld');
		expect(joined(diff.remote)).toBe('hello\nworld - jop\n');
	});

	test('should highlight a line that only one side has', () => {
		const diff = wordDiff('a\nb', 'a\nb\nc');

		expect(highlightedText(diff.local)).toEqual([]);
		expect(highlightedText(diff.remote)).toEqual(['c']);
		expect(joined(diff.local)).toBe('a\nb');
		expect(joined(diff.remote)).toBe('a\nb\nc');
	});

	test('should highlight a rewritten line whole rather than word by word', () => {
		const local = 'This is for example how the web clipper communicates with Joplin, and this is what you need';
		const remote = 'Iam writing this local version here, to have only just yellow card';
		const diff = wordDiff(local, remote);

		expect(highlightedText(diff.local)).toEqual([local]);
		expect(highlightedText(diff.remote)).toEqual([remote]);
	});

	test('should still highlight single words when most of the line matches', () => {
		const diff = wordDiff('hello world this is a test of the system', 'hello world this is a demo of the system');

		expect(highlightedText(diff.local)).toEqual(['test']);
		expect(highlightedText(diff.remote)).toEqual(['demo']);
	});

	test('should keep multiple changes as separate highlights', () => {
		const diff = wordDiff('alpha two gamma four', 'ALPHA two GAMMA four');
		expect(highlightedText(diff.local)).toEqual(['alpha', 'gamma']);
		expect(highlightedText(diff.remote)).toEqual(['ALPHA', 'GAMMA']);
	});

	test.each([
		['single word change', 'the quick brown fox', 'the quick red fox'],
		['multi-line text', 'line one\nline two\nline three', 'line one\nline 2\nline three'],
		['whitespace change', 'a  b', 'a b'],
		['one side empty', '', 'new text'],
		['adjacent changed words', 'one two three', 'ONE TWO three'],
	])('segments should reconstruct both inputs: %s', (_label, local, remote) => {
		const diff = wordDiff(local, remote);
		expect(joined(diff.local)).toBe(local);
		expect(joined(diff.remote)).toBe(remote);
	});

	test('should return no segments for an empty side', () => {
		const diff = wordDiff('', 'text');
		expect(diff.local).toEqual([]);
		expect(highlightedText(diff.remote)).toEqual(['text']);
	});

	// jsdiff only treats Latin text as words. These tests make sure non-Latin
	// words are still highlighted correctly.
	// cSpell:disable
	test.each([
		['cyrillic', 'привет мир', 'привет всем', ['мир'], ['всем']],
		['greek', 'αλφα βητα', 'αλφα γαμμα', ['βητα'], ['γαμμα']],
		['arabic', 'مرحبا بالعالم', 'مرحبا بالجميع', ['بالعالم'], ['بالجميع']],
		['hebrew', 'שלום עולם', 'שלום חברים', ['עולם'], ['חברים']],
		['accented latin', 'café au lait', 'caffé au lait', ['café'], ['caffé']],
		['mixed-script word', 'see appleмир here', 'see apple here', ['appleмир'], ['apple']],
	])('should highlight whole words in non-Latin scripts: %s', (_label, local, remote, expectedLocal, expectedRemote) => {
		const diff = wordDiff(local, remote);
		expect(highlightedText(diff.local)).toEqual(expectedLocal);
		expect(highlightedText(diff.remote)).toEqual(expectedRemote);
	});

	test('should highlight per character in unspaced CJK text', () => {
		const diff = wordDiff('これはペンです', 'これは本です');
		expect(highlightedText(diff.local)).toEqual(['ペン']);
		expect(highlightedText(diff.remote)).toEqual(['本']);
	});
	// cSpell:enable

	test('should keep unchanged whitespace between changed words unhighlighted', () => {
		const diff = wordDiff('one two three', 'ONE TWO three');
		expect(diff.local).toEqual([
			{ text: 'one', highlighted: true },
			{ text: ' ', highlighted: false },
			{ text: 'two', highlighted: true },
			{ text: ' three', highlighted: false },
		]);
	});

});
