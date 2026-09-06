import autoMergeNote, { mergeTitle } from './autoMergeNote';

const baseBody = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';

describe('autoMergeNote', () => {

	test.each([
		['no side changed it', 'Title', 'Title', 'Title', 'Title'],
		['only local changed it', 'Title', 'Local title', 'Title', 'Local title'],
		['only remote changed it', 'Title', 'Title', 'Remote title', 'Remote title'],
		['both made the same change', 'Title', 'New title', 'New title', 'New title'],
	])('should merge the title when %s', (_label, base, local, remote, expected) => {
		const result = mergeTitle(base, local, remote);
		expect(result.conflict).toBe(false);
		expect(result.merged).toBe(expected);
	});

	test('should report a title conflict when both sides changed it differently', () => {
		expect(mergeTitle('Title', 'Local title', 'Remote title').conflict).toBe(true);
	});

	test('should fully merge non-overlapping body edits from both sides', () => {
		const local = baseBody.replace('First paragraph.', 'First paragraph, edited locally.');
		const remote = baseBody.replace('Third paragraph.', 'Third paragraph, edited remotely.');

		const merged = autoMergeNote(
			{ title: 'Title', body: baseBody },
			{ title: 'Title', body: local },
			{ title: 'Title', body: remote },
		);

		expect(merged.fullyMerged).toBe(true);
		expect(merged.resolvedLocal.body).toBe(merged.resolvedCurrent.body);
		expect(merged.resolvedLocal.body).toContain('First paragraph, edited locally.');
		expect(merged.resolvedLocal.body).toContain('Third paragraph, edited remotely.');
	});

	test('should partially merge when a genuine conflict remains elsewhere in the body', () => {
		// First paragraph: both sides make the same edit. Second: they conflict.
		const local = baseBody
			.replace('First paragraph.', 'First paragraph, edited locally.')
			.replace('Second paragraph.', 'Second paragraph, local.');
		const remote = baseBody
			.replace('First paragraph.', 'First paragraph, edited locally.')
			.replace('Second paragraph.', 'Second paragraph, remote.');

		const merged = autoMergeNote(
			{ title: 'Title', body: baseBody },
			{ title: 'Title', body: local },
			{ title: 'Title', body: remote },
		);

		expect(merged.fullyMerged).toBe(false);
		expect(merged.resolvedLocal.body).toContain('First paragraph, edited locally.');
		expect(merged.resolvedCurrent.body).toContain('First paragraph, edited locally.');
		expect(merged.resolvedLocal.body).toContain('Second paragraph, local.');
		expect(merged.resolvedLocal.body).not.toContain('Second paragraph, remote.');
		expect(merged.resolvedCurrent.body).toContain('Second paragraph, remote.');
		expect(merged.resolvedCurrent.body).not.toContain('Second paragraph, local.');
		expect(merged.resolvedLocal.body).toContain('Third paragraph.');
		expect(merged.resolvedCurrent.body).toContain('Third paragraph.');
	});

	test('should report not fully merged and preserve both bodies unchanged with no base', () => {
		const merged = autoMergeNote(
			{ title: '', body: '' },
			{ title: 'Title', body: 'Local body' },
			{ title: 'Title', body: 'Remote body' },
		);
		expect(merged.fullyMerged).toBe(false);
		expect(merged.resolvedLocal.body).toBe('Local body');
		expect(merged.resolvedCurrent.body).toBe('Remote body');
	});

	test('should merge a title change on one side with a body conflict on the other', () => {
		const local = baseBody.replace('Second paragraph.', 'Second paragraph, local.');
		const remote = baseBody.replace('Second paragraph.', 'Second paragraph, remote.');

		const merged = autoMergeNote(
			{ title: 'Title', body: baseBody },
			{ title: 'Local title', body: local },
			{ title: 'Title', body: remote },
		);

		expect(merged.fullyMerged).toBe(false);
		expect(merged.resolvedLocal.title).toBe('Local title');
		expect(merged.resolvedCurrent.title).toBe('Local title');
	});

	test('should keep each side\'s own title when both changed it and the body also conflicts', () => {
		const local = baseBody.replace('Second paragraph.', 'Second paragraph, local.');
		const remote = baseBody.replace('Second paragraph.', 'Second paragraph, remote.');

		const merged = autoMergeNote(
			{ title: 'Title', body: baseBody },
			{ title: 'Local title', body: local },
			{ title: 'Remote title', body: remote },
		);

		expect(merged.fullyMerged).toBe(false);
		expect(merged.resolvedLocal.title).toBe('Local title');
		expect(merged.resolvedCurrent.title).toBe('Remote title');
	});

	test('should report fully merged when both sides made identical edits', () => {
		const edited = baseBody.replace('Second paragraph.', 'Second paragraph, same edit.');

		const merged = autoMergeNote(
			{ title: 'Title', body: baseBody },
			{ title: 'Title', body: edited },
			{ title: 'Title', body: edited },
		);

		expect(merged.fullyMerged).toBe(true);
		expect(merged.resolvedLocal.body).toBe(edited);
		expect(merged.resolvedCurrent.body).toBe(edited);
	});
});
