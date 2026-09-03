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

	test('should treat a trailing-whitespace edit to a line the other side also changed as a conflict', () => {
		const base = 'Visit Google.\n\nVisit GitHub.';
		const local = 'Visit Google.: https://youtube.com/\n\nVisit GitHub. ';
		const remote = 'Visit Google.: https://youtube.com/\n\nVisit GitHub.: https://github.com/inbox';
		const result = autoMerge(base, local, remote);
		const conflicts = result.sections.filter(s => s.type === 'conflict');
		expect(conflicts.length).toBe(1);
		expect(conflicts[0].localText).toBe('Visit GitHub. ');
		expect(conflicts[0].remoteText).toBe('Visit GitHub.: https://github.com/inbox');
	});

	test('should apply a whitespace-only edit made by one side', () => {
		const base = 'Alpha\n\nBeta\n\nGamma';
		const local = 'Alpha \n\nBeta\n\nGamma';
		const remote = 'Alpha\n\nBeta\n\nGamma edited';
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('Alpha \n\nBeta\n\nGamma edited');
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
		// Splitting on \n alone would leave a \r on every line, so both sides would look changed
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

	test.each([
		['at the start of the note', ['x', 'x', 'a', 'b', 'c'], 0],
		['at the end of the note', ['a', 'b', 'c', 'x', 'x'], 3],
		['a run of four', ['x', 'x', 'x', 'x', 'a'], 1],
		['a run of five', ['x', 'x', 'x', 'x', 'x'], 2],
	])('should conflict when an edit lands on a duplicate run %s', (_name, lines, editLine) => {
		const base = lines.join('\n');
		const local = lines.map((l, i) => i === editLine ? `${l} local` : l).join('\n');
		const remote = lines.map((l, i) => i === lines.length - 1 ? `${l} remote` : l).join('\n');
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(true);
	});

	test('should conflict when both sides insert before a single repeated line', () => {
		const result = autoMerge('x', 'A\nx', 'B\nx');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(true);
	});

	test('should still merge when both sides made the same change to a duplicate run', () => {
		const result = autoMerge('x\nx', 'A\nx\nx', 'A\nx\nx');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('A\nx\nx');
	});

	test('should still merge when identical lines are not adjacent', () => {
		const result = autoMerge('x\nhello\nx', 'x local\nhello\nx', 'x\nhello\nx remote');
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toBe('x local\nhello\nx remote');
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

	test('should merge a note with heavily repeated lines', () => {
		const base = Array.from({ length: 2000 }, (_, i) => i % 2 === 0 ? `Text ${i}` : '').join('\n');
		const local = base.replace('Text 0', 'Text 0 local');
		const remote = base.replace('Text 1998', 'Text 1998 remote');
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toContain('Text 0 local');
		expect(result.mergedText).toContain('Text 1998 remote');
	});

	test('should merge a long note whose lines are mostly unique', () => {
		const base = Array.from({ length: 20000 }, (_, i) => `Line ${i} unique content.`).join('\n');
		const local = base.replace('Line 0 ', 'Line 0 local ');
		const remote = base.replace('Line 19999 ', 'Line 19999 remote ');
		const result = autoMerge(base, local, remote);
		expect(result.sections.some(s => s.type === 'conflict')).toBe(false);
		expect(result.mergedText).toContain('Line 0 local');
		expect(result.mergedText).toContain('Line 19999 remote');
	});

	test('should conflict when the two versions are too different to diff', () => {
		const base = Array.from({ length: 20000 }, (_, i) => `Line ${i}`).join('\n');
		const local = Array.from({ length: 20000 }, (_, i) => `Local ${i}`).join('\n');
		const remote = Array.from({ length: 20000 }, (_, i) => `Remote ${i}`).join('\n');
		const result = autoMerge(base, local, remote);
		expect(result.sections.length).toBe(1);
		expect(result.sections[0].type).toBe('conflict');
	});

	test('should be deterministic for the same inputs', () => {
		const base = 'a\nb\nc';
		const local = 'A\nb\nc';
		const remote = 'a\nb\nC';
		expect(autoMerge(base, local, remote)).toEqual(autoMerge(base, local, remote));
	});

});
