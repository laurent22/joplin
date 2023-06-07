import { expectThrow } from '@joplin/lib/testing/test-utils';
import { filesApplyToPlatform, parseRenovateMessage, RenovateMessage, summarizeRenovateMessages } from './git-changelog';

describe('git-changelog', () => {

	test('should find out if a file path is relevant to a platform', async () => {
		type TestCase = [string[], string, boolean];

		const testCases: TestCase[] = [
			[['packages/app-mobile/package.json'], 'ios', true],
			[['packages/app-mobile/package.json'], 'android', true],
			[['packages/app-mobile/package.json'], 'destop', false],
			[[], 'destop', false],
			[['packages/server/package.json'], 'server', true],
			[['packages/app-mobile/package.json', 'packages/server/package.json'], 'server', true],
			[['packages/app-mobile/package.json', 'packages/server/package.json'], 'android', true],
			[['packages/app-mobile/package.json', 'packages/server/package.json'], 'desktop', false],
			[['packages/server/package.json'], 'desktop', false],
			[['packages/lib/package.json'], 'server', true],
			[['packages/lib/package.json'], 'desktop', true],
			[['packages/lib/package.json'], 'android', true],
			[['packages/lib/package.json'], 'clipper', false],
			[['packages/app-clipper/package.json'], 'clipper', true],
		];

		for (const testCase of testCases) {
			const [files, platform, expected] = testCase;
			const actual = filesApplyToPlatform(files, platform);
			expect(actual).toBe(expected);
		}
	});

	test('should parse Renovate messages', async () => {
		type TestCase = [string, string, string];

		const testCases: TestCase[] = [
			['Update typescript-eslint monorepo to v5 (#7291)', 'typescript-eslint', 'v5'],
			['Update aws-sdk-js-v3 monorepo to v3.215.0', 'aws-sdk-js-v3', 'v3.215.0'],
			['Update dependency moment to v2.29.4 (#7087)', 'moment', 'v2.29.4'],
			['Update aws (#8106)', 'aws', ''],
		];

		for (const testCase of testCases) {
			const [message, pkg, version] = testCase;
			const actual = parseRenovateMessage(message);
			expect(actual.package).toBe(pkg);
			expect(actual.version).toBe(version);
		}

		await expectThrow(async () => parseRenovateMessage('not a renovate message'));
	});

	test('should summarize Renovate messages', async () => {
		type TestCase = [RenovateMessage[], string];

		const testCases: TestCase[] = [
			[
				[
					{ package: 'sas', version: 'v1.0' },
					{ package: 'sas', version: 'v1.2' },
					{ package: 'moment', version: 'v3.4' },
					{ package: 'eslint', version: 'v1.2' },
					{ package: 'aws', version: '' },
				],
				'Updated packages aws, moment (v3.4), sas (v1.2)',
			],
			[
				[
					{ package: 'eslint', version: 'v1.2' },
				],
				'',
			],
			[
				[],
				'',
			],
		];

		for (const testCase of testCases) {
			const [messages, expected] = testCase;
			const actual = summarizeRenovateMessages(messages);
			expect(actual).toBe(expected);
		}
	});

});
