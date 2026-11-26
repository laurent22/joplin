import { EditorSelection } from '@codemirror/state';
import normalizeRenderedSelection, { HiddenSyntaxRange } from './normalizeRenderedSelection';

describe('normalizeRenderedSelection', () => {
	const bold: HiddenSyntaxRange[] = [
		{ from: 8, to: 10, ownerFrom: 8, ownerTo: 16 },
		{ from: 14, to: 16, ownerFrom: 8, ownerTo: 16 },
	];

	it('should keep touching delimiters associated with their own constructs', () => {
		// **one***two*: the closing ** and opening * are adjacent.
		const hidden = [
			{ from: 0, to: 2, ownerFrom: 0, ownerTo: 7 },
			{ from: 5, to: 7, ownerFrom: 0, ownerTo: 7 },
			{ from: 7, to: 8, ownerFrom: 7, ownerTo: 12 },
			{ from: 11, to: 12, ownerFrom: 7, ownerTo: 12 },
		];
		expect(normalizeRenderedSelection(EditorSelection.single(2, 5), hidden).main).toMatchObject({ from: 0, to: 7 });
		expect(normalizeRenderedSelection(EditorSelection.single(8, 11), hidden).main).toMatchObject({ from: 7, to: 12 });
		// Endpoints on the far side of the merged "***" run must not pick up the neighbour's marks.
		expect(normalizeRenderedSelection(EditorSelection.single(12, 5), hidden).main).toMatchObject({ anchor: 12, head: 7 });
		expect(normalizeRenderedSelection(EditorSelection.single(0, 8), hidden).main).toMatchObject({ anchor: 0, head: 7 });
	});

	it('should include nested delimiters without depending on provider order', () => {
		// ***bold***
		const hidden = [
			{ from: 0, to: 1, ownerFrom: 0, ownerTo: 10 },
			{ from: 1, to: 3, ownerFrom: 1, ownerTo: 9 },
			{ from: 7, to: 9, ownerFrom: 1, ownerTo: 9 },
			{ from: 9, to: 10, ownerFrom: 0, ownerTo: 10 },
		];
		const selection = EditorSelection.single(3, 7);
		for (const syntax of [hidden, [...hidden].reverse()]) {
			expect(normalizeRenderedSelection(selection, syntax).main).toMatchObject({ from: 0, to: 10 });
		}
	});

	it('should preserve other ranges, their direction, and the main range', () => {
		const selection = EditorSelection.create([
			EditorSelection.range(4, 2),
			EditorSelection.range(14, 10),
			EditorSelection.cursor(20),
		], 1);
		const result = normalizeRenderedSelection(selection, bold);
		expect(result.mainIndex).toBe(1);
		expect(result.ranges).toHaveLength(3);
		expect(result.ranges[0]).toBe(selection.ranges[0]);
		expect(result.ranges[1]).toMatchObject({ anchor: 16, head: 8 });
		expect(result.ranges[2]).toBe(selection.ranges[2]);
	});

	it('should never add visible text for any selection around nested or adjacent constructs', () => {
		const hidden = [
			...bold,
			{ from: 10, to: 11, ownerFrom: 10, ownerTo: 14 },
			{ from: 13, to: 14, ownerFrom: 10, ownerTo: 14 },
			{ from: 16, to: 17, ownerFrom: 16, ownerTo: 20 },
			{ from: 19, to: 20, ownerFrom: 16, ownerTo: 20 },
		];
		const isHidden = (position: number) => hidden.some(range => position >= range.from && position < range.to);
		for (let from = 0; from <= 21; from++) {
			for (let to = from; to <= 21; to++) {
				const selection = EditorSelection.single(from, to);
				const result = normalizeRenderedSelection(selection, hidden);
				for (let position = result.main.from; position < result.main.to; position++) {
					expect(position >= from && position < to || isHidden(position)).toBe(true);
				}
				expect(normalizeRenderedSelection(result, hidden).eq(result)).toBe(true);
			}
		}
	});
});
