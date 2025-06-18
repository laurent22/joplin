import { getIsPreRelease, getVersionFromTag } from './buildWebappDocker';

describe('buildWebappDocker', () => {

	test('should get the tag version', async () => {
		type TestCase = [string, boolean, string];

		const testCases: TestCase[] = [
			['webapp-v1.2.3-beta', true, '1.2.3-beta'],
			['webapp-v1.2.3-beta', false, '1.2.3'],
			['webapp-v1.2.3', false, '1.2.3'],
			['webapp-v1.2.3-zxc', true, '1.2.3-beta.zxc'],
			['webapp-v1.2.3-zxc', false, '1.2.3'],
			['webapp-v1.2.3-4-zxc', true, '1.2.3-beta.4.zxc'],
			['webapp-v1.2.3-4-zxc', false, '1.2.3'],
			['webapp-1.2.3-4-zxc', true, '1.2.3-beta.4.zxc'],
			['webapp-1.2.3-4-zxc', false, '1.2.3'],
		];

		for (const testCase of testCases) {
			const [tagName, isPreRelease, expected] = testCase;
			const actual = getVersionFromTag(tagName, isPreRelease);
			expect(actual).toBe(expected);
		}
	});

	test('should check if it is a pre-release', async () => {
		type TestCase = [string, boolean];

		const testCases: TestCase[] = [
			['webapp-v1.1.2-beta', false], // For now, always returns false
			['webapp-v1.1.2', false],
		];

		for (const testCase of testCases) {
			const [tagName, expected] = testCase;
			const actual = getIsPreRelease(tagName);
			expect(actual).toBe(expected);
		}
	});

});
