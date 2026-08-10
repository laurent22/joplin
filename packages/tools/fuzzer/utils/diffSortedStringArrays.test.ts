import diffSortedStringArrays from './diffSortedStringArrays';

describe('diffSortedStringArrays', () => {
	test.each([
		[
			['a'],
			[],
			{ unexpected: ['a'], missing: [] },
		],
		[
			['a', 'b'],
			['a', 'b'],
			{ unexpected: [], missing: [] },
		],
		[
			[],
			['a'],
			{ unexpected: [], missing: ['a'] },
		],
		[
			['a'],
			['b', 'c'],
			{ unexpected: ['a'], missing: ['b', 'c'] },
		],
		[
			['a', 'b', 'c', 'd', 'e', 'f'],
			['a', 'e'],
			{ unexpected: ['b', 'c', 'd', 'f'], missing: [] },
		],
	])('should diff string arrays: %j, %j', (actual, expected, diff) => {
		expect(diffSortedStringArrays(actual, expected)).toEqual(diff);
	});
});

