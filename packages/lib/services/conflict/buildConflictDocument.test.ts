import buildConflictDocument, { ConflictRegionKind } from './buildConflictDocument';
import { MergedSection } from './diffNotes';

describe('buildConflictDocument', () => {

	test('should keep the remote side in the document and the local side aside', () => {
		const sections: MergedSection[] = [
			{ text: 'unchanged', type: 'unchanged' },
			{ text: 'placeholder', type: 'conflict', localText: 'mine', remoteText: 'theirs' },
			{ text: 'tail', type: 'unchanged' },
		];

		const document = buildConflictDocument(sections);

		expect(document.text).toBe('unchanged\ntheirs\ntail');
		expect(document.regions).toEqual([{ from: 10, to: 16, localText: 'mine', kind: ConflictRegionKind.Changed }]);
	});

	test('should not put conflict markers in the document', () => {
		const sections: MergedSection[] = [
			{ text: '<<<<<<< local\nmine\n=======\ntheirs\n>>>>>>> remote', type: 'conflict', localText: 'mine', remoteText: 'theirs' },
		];

		const document = buildConflictDocument(sections);

		expect(document.text).toBe('theirs');
		expect(document.text).not.toContain('<<<<<<<');
	});

	test('region offsets should point at the conflicting text', () => {
		const sections: MergedSection[] = [
			{ text: 'one', type: 'unchanged' },
			{ text: 'x', type: 'conflict', localText: 'LOCAL A', remoteText: 'remote a' },
			{ text: 'two', type: 'auto-merged' },
			{ text: 'y', type: 'conflict', localText: 'LOCAL B', remoteText: 'remote b' },
		];

		const document = buildConflictDocument(sections);

		for (const region of document.regions) {
			expect(document.text.slice(region.from, region.to)).toMatch(/^remote [ab]$/);
		}
		expect(document.regions.map(r => r.localText)).toEqual(['LOCAL A', 'LOCAL B']);
	});

	test('should handle a side that was deleted on the other version', () => {
		const sections: MergedSection[] = [
			{ text: 'x', type: 'conflict', localText: 'kept', remoteText: '' },
			{ text: 'after', type: 'unchanged' },
		];

		const document = buildConflictDocument(sections);

		expect(document.text).toBe('\nafter');
		expect(document.regions).toEqual([{ from: 0, to: 0, localText: 'kept', kind: ConflictRegionKind.OnlyMine }]);
	});

	test('should classify each region by which version has the text', () => {
		const sections: MergedSection[] = [
			{ text: 'a', type: 'conflict', localText: 'mine', remoteText: 'theirs' },
			{ text: 'b', type: 'conflict', localText: 'only mine', remoteText: '' },
			{ text: 'c', type: 'conflict', localText: '', remoteText: 'only theirs' },
		];

		const document = buildConflictDocument(sections);

		expect(document.regions.map(r => r.kind)).toEqual([
			ConflictRegionKind.Changed,
			ConflictRegionKind.OnlyMine,
			ConflictRegionKind.OnlyTheirs,
		]);
	});

	test('should return an empty document when there are no sections', () => {
		expect(buildConflictDocument([])).toEqual({ text: '', regions: [] });
	});

	test('auto-merged sections should not become regions', () => {
		const sections: MergedSection[] = [
			{ text: 'merged in', type: 'auto-merged' },
			{ text: 'plain', type: 'unchanged' },
		];

		const document = buildConflictDocument(sections);

		expect(document.text).toBe('merged in\nplain');
		expect(document.regions).toEqual([]);
	});
});
