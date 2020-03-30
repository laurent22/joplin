/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const ArrayUtils = require('lib/ArrayUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('ArrayUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should remove array elements', asyncTest(async () => {
		let a = ['un', 'deux', 'trois'];
		a = ArrayUtils.removeElement(a, 'deux');

		expect(a[0]).toBe('un');
		expect(a[1]).toBe('trois');
		expect(a.length).toBe(2);

		a = ['un', 'deux', 'trois'];
		a = ArrayUtils.removeElement(a, 'not in there');
		expect(a.length).toBe(3);
	}));

	it('should find items using binary search', asyncTest(async () => {
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

	it('should compare arrays', asyncTest(async () => {
		expect(ArrayUtils.contentEquals([], [])).toBe(true);
		expect(ArrayUtils.contentEquals(['a'], ['a'])).toBe(true);
		expect(ArrayUtils.contentEquals(['b', 'a'], ['a', 'b'])).toBe(true);
		expect(ArrayUtils.contentEquals(['b'], ['a', 'b'])).toBe(false);
	}));

	it('should merge overlapping intervals', asyncTest(async () => {
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
