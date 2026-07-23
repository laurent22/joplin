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

	// / KNOWN LIMITATION: Word-level merging within a single line is all or nothing.
	// If a line contains both a real conflict (both sides changed the same words)
	// and a change that could be merged automatically (only one side changed other
	// words), the entire line is treated as a conflict and the mergeable change is
	// not applied. In the future, the line could be split into auto-merged and
	// conflict parts. This test documents the current behavior so any future
	// change is intentional.
	test('should treat a line with both a conflict and a mergeable edit as a whole-line conflict (known limitation)', () => {
		const base = 'The quick brown fox jumps over the dog';
		// Both sides rewrote "quick" differently (conflict), and only remote also
		// changed "dog" -> "cat" (independently mergeable).
		const local = 'The slow brown fox jumps over the dog';
		const remote = 'The fast brown fox jumps over the cat';
		const result = autoMerge(base, local, remote);
		const conflicts = result.sections.filter(s => s.type === 'conflict');
		expect(conflicts.length).toBe(1);
		// The whole line is the conflict, including the mergeable "dog"/"cat" edit,
		// which is therefore not auto-applied.
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
		// The editor can leave a trailing space on a line the user did not really
		// change. Only remote makes a real edit here, so it must merge cleanly.
		const base = 'Visit Google.\n\nVisit GitHub.';
		const local = 'Visit Google.: https://youtube.com/\n\nVisit GitHub. ';
		const remote = 'Visit Google.: https://youtube.com/\n\nVisit GitHub.: https://github.com/inbox';
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('Visit Google.: https://youtube.com/\n\nVisit GitHub.: https://github.com/inbox');
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
