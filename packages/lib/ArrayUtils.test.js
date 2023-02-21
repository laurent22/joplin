const ArrayUtils = require('./ArrayUtils');

describe('ArrayUtils', () => {



	it('should remove array elements', (async () => {
		let a = ['un', 'deux', 'trois'];
		a = ArrayUtils.removeElement(a, 'deux');

		expect(a[0]).toBe('un');
		expect(a[1]).toBe('trois');
		expect(a.length).toBe(2);

		a = ['un', 'deux', 'trois'];
		a = ArrayUtils.removeElement(a, 'not in there');
		expect(a.length).toBe(3);
	}));

	it('should pull array elements', (async () => {
		expect(ArrayUtils.pull(['a', 'b', 'c', 'a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'b', 'c']);
		expect(ArrayUtils.pull(['b', 'c', 'b', 'c'], 'a')).toEqual(['b', 'c', 'b', 'c']);
		expect(ArrayUtils.pull(['a', 'b', 'c', 'a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'b']);
		expect(ArrayUtils.pull([], 'a')).toEqual([]);
	}));

	it('should find items using binary search', (async () => {
		let items = ['aaa', 'ccc', 'bbb'];
		expect(ArrayUtils.binarySearch(items, 'bbb')).toBe(-1); // Array not sorted!
		items.sort();
		expect(ArrayUtils.binarySearch(items, 'bbb')).toBe(1);
		expect(ArrayUtils.binarySearch(items, 'ccc')).toBe(2);
		expect(ArrayUtils.binarySearch(items, 'oops')).toBe(-1);
		expect(ArrayUtils.binarySearch(items, 'aaa')).toBe(0);

		items = [];
		expect(ArrayUtils.binarySearch(items, 'aaa')).toBe(-1);
	}));

	it('should compare arrays', (async () => {
		expect(ArrayUtils.contentEquals([], [])).toBe(true);
		expect(ArrayUtils.contentEquals(['a'], ['a'])).toBe(true);
		expect(ArrayUtils.contentEquals(['b', 'a'], ['a', 'b'])).toBe(true);
		expect(ArrayUtils.contentEquals(['b'], ['a', 'b'])).toBe(false);
	}));

	it('should merge overlapping intervals', (async () => {
		const testCases = [
			[
				[],
				[],
			],
			[
				[[0, 50]],
				[[0, 50]],
			],
			[
				[[0, 20], [20, 30]],
				[[0, 30]],
			],
			[
				[[0, 10], [10, 50], [15, 30], [20, 80], [80, 95]],
				[[0, 95]],
			],
			[
				[[0, 5], [0, 10], [25, 35], [30, 60], [50, 60], [85, 100]],
				[[0, 10], [25, 60], [85, 100]],
			],
			[
				[[0, 5], [10, 40], [35, 50], [35, 75], [50, 60], [80, 85], [80, 90]],
				[[0, 5], [10, 75], [80, 90]],
			],
		];

		testCases.forEach((t, i) => {
			const intervals = t[0];
			const expected = t[1];

			const actual = ArrayUtils.mergeOverlappingIntervals(intervals, intervals.length);
			expect(actual).toEqual(expected, `Test case ${i}`);
		});
	}));

});
