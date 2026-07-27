import { autoMerge } from './diffNotes';

describe('autoMerge', () => {

	test('should auto-apply non-conflicting changes on different lines', () => {
		const base = 'one\ntwo\nthree';
		const local = 'ONE\ntwo\nthree';
		const remote = 'one\ntwo\nTHREE';
		const result = autoMerge(base, local, remote);
		expect(result.mergedText).toBe('ONE\ntwo\nTHREE');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.sections.some(s => s.type === 'auto-merged')).toBe(true);
	});

	test('should keep a region where both sides changed the same line differently as a conflict', () => {
		const base = 'one\ntwo\nthree';
		const local = 'one\nMINE\nthree';
		const remote = 'one\nTHEIRS\nthree';
		const result = autoMerge(base, local, remote);
		const conflicts = result.sections.filter(s => s.type === 'conflict');
		expect(conflicts.length).toBe(1);
		expect(conflicts[0].localText).toBe('MINE');
		expect(conflicts[0].remoteText).toBe('THEIRS');
		expect(result.mergedText).toContain('<<<<<<< local');
		expect(result.mergedText).toContain('>>>>>>> remote');
	});

	test('should mix auto-merged and conflict sections', () => {
		const base = 'title\nbody\nfooter';
		const local = 'TITLE\nbody\nMY FOOTER';
		const remote = 'title\nbody\nTHEIR FOOTER';
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'auto-merged')).toBe(true);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(true);
		expect(result.mergedText).toContain('TITLE');
	});

	test('should merge two edits to different words in the same paragraph', () => {
		const base = 'The quick brown fox jumps over the lazy dog';
		const local = 'The slow brown fox jumps over the lazy dog';
		const remote = 'The quick brown fox jumps over the sleepy dog';
		const result = autoMerge(base, local, remote);
		expect(result.mergedText).toBe('The slow brown fox jumps over the sleepy dog');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
	});

	// KNOWN LIMITATION: If a line has both a real conflict and a change that can
	// be merged, then the whole line is treated as a conflict.
	// In future, the line could be split into auto-merged and conflict parts
	test('should treat a line with both a conflict and a mergeable edit as a whole-line conflict (known limitation)', () => {
		// Both sides changed "quick" (conflict); only remote changed "dog"->"cat".
		const base = 'The quick brown fox jumps over the dog';
		const local = 'The slow brown fox jumps over the dog';
		const remote = 'The fast brown fox jumps over the cat';
		const result = autoMerge(base, local, remote);
		const conflicts = result.sections.filter(s => s.type === 'conflict');
		expect(conflicts.length).toBe(1);
		// The "dog" -> "cat" change is not merged because the whole line is treated as a conflict.
		expect(conflicts[0].localText).toBe(local);
		expect(conflicts[0].remoteText).toBe(remote);
	});

	test('should treat identical changes on both sides as a false conflict (auto-merged)', () => {
		const base = 'one\ntwo\nthree';
		const local = 'one\nSAME\nthree';
		const remote = 'one\nSAME\nthree';
		const result = autoMerge(base, local, remote);
		expect(result.mergedText).toBe('one\nSAME\nthree');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
	});

	test('should not treat an invisible trailing-whitespace edit as a conflict', () => {
		// Local's only change to the GitHub line is a stray trailing space
		const base = 'Visit Google.\n\nVisit GitHub.';
		const local = 'Visit Google.: https://youtube.com/\n\nVisit GitHub. ';
		const remote = 'Visit Google.: https://youtube.com/\n\nVisit GitHub.: https://github.com/inbox';
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('Visit Google.: https://youtube.com/\n\nVisit GitHub.: https://github.com/inbox');
	});

	test('should preserve a two-space Markdown hard line break on an untouched line', () => {
		// Only the last paragraph changes. The two-space line break above it must stay
		const base = 'Line one  \nLine two\n\nLast para.';
		const local = 'Line one  \nLine two\n\nLast para, edited.';
		const remote = 'Line one  \nLine two\n\nLast para.';
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('Line one  \nLine two\n\nLast para, edited.');
	});

	test('with empty base should mark only the differing line as a conflict', () => {
		const result = autoMerge('', 'my version', 'their version');
		expect(result.sections.length).toBe(1);
		expect(result.sections[0].type).toBe('conflict');
		expect(result.sections[0].localText).toBe('my version');
		expect(result.sections[0].remoteText).toBe('their version');
	});

	test('with empty base should keep matching lines unchanged and split on the conflict', () => {
		const local = 'Shared paragraph\nstays the same\n\nNature is the physical world by "DOGS"';
		const remote = 'Shared paragraph\nstays the same\n\nNature is the "MORE MENTAL" world by humans';
		const result = autoMerge('', local, remote);
		const conflicts = result.sections.filter(s => s.type === 'conflict');
		expect(conflicts.length).toBe(1);
		expect(conflicts[0].localText).toBe('Nature is the physical world by "DOGS"');
		expect(conflicts[0].remoteText).toBe('Nature is the "MORE MENTAL" world by humans');
		expect(result.sections.some(s => s.type === 'unchanged' && s.text.includes('Shared paragraph'))).toBe(true);
	});

	test('should be deterministic for the same inputs', () => {
		const base = 'a\nb\nc';
		const local = 'A\nb\nc';
		const remote = 'a\nb\nC';
		expect(autoMerge(base, local, remote)).toEqual(autoMerge(base, local, remote));
	});

});
