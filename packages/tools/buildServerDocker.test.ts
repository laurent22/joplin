import { getIsPreRelease, getVersionFromTag } from './buildServerDocker';

describe('buildServerDocker', function() {

	test('should get the tag version', async () => {
		type TestCase = [string, boolean, string];

		const testCases: TestCase[] = [
			['server-v1.1.2-beta', true, '1.1.2-beta'],
			['server-v1.1.2', false, '1.1.2'],
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
			['server-v1.1.2-beta', true],
			['server-v1.1.2', true], // For now, always returns true
		];

		for (const testCase of testCases) {
			const [tagName, expected] = testCase;
			const actual = getIsPreRelease(tagName);
			expect(actual).toBe(expected);
		}
	});

});
