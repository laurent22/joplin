import { getIsPreRelease, getVersionFromTag } from './buildServerDocker';

describe('buildServerDocker', () => {

	test('should get the tag version', async () => {
		type TestCase = [string, boolean, string];

		const testCases: TestCase[] = [
			['server-v1.2.3-beta', true, '1.2.3-beta'],
			['server-v1.2.3-beta', false, '1.2.3'],
			['server-v1.2.3', false, '1.2.3'],
			['server-v1.2.3-zxc', true, '1.2.3-beta.zxc'],
			['server-v1.2.3-zxc', false, '1.2.3'],
			['server-v1.2.3-4-zxc', true, '1.2.3-beta.4.zxc'],
			['server-v1.2.3-4-zxc', false, '1.2.3'],
			['server-1.2.3-4-zxc', true, '1.2.3-beta.4.zxc'],
			['server-1.2.3-4-zxc', false, '1.2.3'],
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
			['server-v1.1.2-beta', false], // For now, always returns false
			['server-v1.1.2', false],
		];

		for (const testCase of testCases) {
			const [tagName, expected] = testCase;
			const actual = getIsPreRelease(tagName);
			expect(actual).toBe(expected);
		}
	});

});
