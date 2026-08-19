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

	// Merging is line based, so two edits to different words on the same line are a
	// conflict even though the words themselves don't overlap
	test('should treat two edits to different words on the same line as a conflict', () => {
		const base = 'The quick brown fox jumps over the lazy dog';
		const local = 'The slow brown fox jumps over the lazy dog';
		const remote = 'The quick brown fox jumps over the sleepy dog';
		const result = autoMerge(base, local, remote);
		const conflicts = result.sections.filter(s => s.type === 'conflict');
		expect(conflicts.length).toBe(1);
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

	test.each([
		['a single trailing space', 'Alpha '],
		['a trailing tab', 'Alpha\t'],
		['three trailing spaces', 'Alpha   '],
		['a two-space hard line break', 'Alpha  '],
	])('should keep %s on a line neither side changed', (_label, firstLine) => {
		// The edits are kept in separate paragraphs so they land in different regions
		const base = `${firstLine}\nBeta\n\nGamma\n\nDelta`;
		const local = `${firstLine}\nBeta edited\n\nGamma\n\nDelta`;
		const remote = `${firstLine}\nBeta\n\nGamma\n\nDelta edited`;
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe(`${firstLine}\nBeta edited\n\nGamma\n\nDelta edited`);
	});

	test('should merge a note written with Windows line endings', () => {
		// Splitting on \n alone would leave a \r on every line, so the trailing space
		// below would never be normalised and both sides would look changed
		const base = 'Alpha \r\nBeta\r\n\r\nGamma';
		const local = 'Alpha \r\nBeta edited\r\n\r\nGamma';
		const remote = 'Alpha \r\nBeta\r\n\r\nGamma edited';
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('Alpha \nBeta edited\n\nGamma edited');
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

	test.each([
		['edits at either end of a run', 'aaa\naaa\naaa', 'aaa --local\naaa\naaa', 'aaa\naaa\naaa --remote'],
		['both sides inserting near a run', 'x\nx', 'A\nx\nx', 'x\nA\nx'],
		['repeated list items', '- todo\n- todo\n- done', '- TODO1\n- todo\n- done', '- todo\n- todo\n- DONE'],
	])('should conflict rather than merge when the base has duplicate lines: %s', (_name, base, local, remote) => {
		const result = autoMerge(base, local, remote);
		expect(result.sections.every(s => s.type === 'conflict')).toBe(true);
		expect(result.sections[0].localText).toBe(local);
		expect(result.sections[0].remoteText).toBe(remote);
	});

	test.each([
		['before the run and between it', 'x\nx', 'A\nx\nx', 'x\nA\nx'],
		['between the run and after it', 'x\nx', 'x\nA\nx', 'x\nx\nA'],
		['before the run and after it', 'x\nx', 'A\nx\nx', 'x\nx\nA'],
		['at either end of a longer run', 'x\nx\nx', 'A\nx\nx\nx', 'x\nx\nx\nA'],
		['in the middle of a longer run', 'x\nx\nx', 'x\nA\nx\nx', 'x\nx\nA\nx'],
	])('should conflict when both sides insert into a duplicate run: %s', (_name, base, local, remote) => {
		const result = autoMerge(base, local, remote);
		expect(result.sections.every(s => s.type === 'conflict')).toBe(true);
	});

	test('should conflict when one side deletes from a duplicate run and the other edits', () => {
		const result = autoMerge('x\nx\nx\nA\nB', 'x\nx\nA\nB', 'x\nx\nx\nA\nB edited');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(true);
	});

	test('should still merge when only one side changed a note with duplicate lines', () => {
		const result = autoMerge('aaa\naaa\naaa', 'aaa --local\naaa\naaa', 'aaa\naaa\naaa');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('aaa --local\naaa\naaa');
	});

	test('should still merge when a duplicate run is far from both edits', () => {
		const base = 'line0\nline1\nline2\nsame\nsame\ntail0\ntail1\ntail2';
		const local = base.replace('line0', 'line0 EDIT');
		const remote = base.replace('tail2', 'tail2 EDIT');
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('line0 EDIT\nline1\nline2\nsame\nsame\ntail0\ntail1\ntail2 EDIT');
	});

	test('should still merge a note whose blank lines are not consecutive', () => {
		const base = 'Title\n\nAgenda\n\nBudget';
		const result = autoMerge(base, base.replace('Agenda', 'Agenda X'), base.replace('Budget', 'Budget Y'));
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('Title\n\nAgenda X\n\nBudget Y');
	});

	test('should not reinstate a line both sides deleted', () => {
		const base = 'intro\n\nbody\n\nend';
		const edited = 'intro\nbody\n\nend';
		const result = autoMerge(base, edited, edited);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe(edited);
	});

	test('should be deterministic for the same inputs', () => {
		const base = 'a\nb\nc';
		const local = 'A\nb\nc';
		const remote = 'a\nb\nC';
		expect(autoMerge(base, local, remote)).toEqual(autoMerge(base, local, remote));
	});

});
