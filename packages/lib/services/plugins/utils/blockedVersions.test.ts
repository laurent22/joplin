import { isValidBlockedVersionEntry, isVersionBlocked, mergeBlockedVersions } from './blockedVersions';

describe('blockedVersions', () => {

	test.each([
		[['1.2.3'], '1.2.3', true],
		[['1.2.3'], '1.2.4', false],
		[['>=1.2.3'], '1.2.2', false],
		[['>=1.2.3'], '1.2.4', true],
		[['>=1.2.3'], '2.0.0', true],
		[['1.2.3', '1.2.4'], '1.2.5', false],
		[['*'], '0.0.1', true],
		[['not a version'], '1.2.3', true],
		[[], '1.2.3', false],
		[undefined, '1.2.3', false],
	])('should tell if a version is blocked (%j, %s)', (blockedVersions, version, expected) => {
		expect(isVersionBlocked(blockedVersions, version)).toBe(expected);
	});

	test.each([
		['*', true],
		['1.2.3', true],
		['>=1.2.3', true],
		['>=1.2.3 <1.2.5', true],
		['1.2.3 - 1.2.4', true],
		['1.2.3 || >=2.0.0', true],
		['<1.0.0 || garbage', false],
		['>=1.2.3 garbage', false],
		['>=1.2.3\t<2.0.0', false],
		['1.2', false],
		['v1.2.3', false],
		['>=x', false],
		['', false],
		[123, false],
	])('should validate blocked version entries (%j)', (entry, expected) => {
		expect(isValidBlockedVersionEntry(entry)).toBe(expected);
	});

	test('should only add blocks when merging', () => {
		const current = { 'plugin.a': ['>=1.2.3'], 'plugin.b': ['*'] };
		const fetched = { 'plugin.a': ['1.2.3', '1.2.4'], 'plugin.c': ['2.0.0'] };
		expect(mergeBlockedVersions(current, fetched)).toEqual({
			'plugin.a': ['>=1.2.3', '1.2.3', '1.2.4'],
			'plugin.b': ['*'],
			'plugin.c': ['2.0.0'],
		});
	});

});
