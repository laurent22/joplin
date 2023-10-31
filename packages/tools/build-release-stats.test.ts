import { replaceGitHubInternalLinks } from './build-release-stats';

describe('build-release-stats', () => {

	it('should replace GitHub internal link', async () => {
		const testCases = [
			[
				'(15ce5cd)',
				'([15ce5cd](https://github.com/laurent22/joplin/commit/15ce5cd))',
			],
			[
				'(#8532 by Henry Heino)',
				'([#8532](https://github.com/laurent22/joplin/issues/8532) by Henry Heino)',
			],
			[
				'([15ce5cd](https://github.com/laurent22/joplin/commit/15ce5cd))',
				'([15ce5cd](https://github.com/laurent22/joplin/commit/15ce5cd))',
			],
			[
				'([#8532](https://github.com/laurent22/joplin/issues/8532) by Henry Heino)',
				'([#8532](https://github.com/laurent22/joplin/issues/8532) by Henry Heino)',
			],
			[
				'list (#8825) (#8194 by [@CptMeetKat](https://github.com/CptMeetKat))',
				'list ([#8825](https://github.com/laurent22/joplin/issues/8825)) ([#8194](https://github.com/laurent22/joplin/issues/8194) by [@CptMeetKat](https://github.com/CptMeetKat))',
			],
			[
				'- Improved: Support for plural translations (#9033)',
				'- Improved: Support for plural translations ([#9033](https://github.com/laurent22/joplin/issues/9033))',
			],
		];

		for (const [input, expected] of testCases) {
			const actual = replaceGitHubInternalLinks(input);
			expect(actual).toBe(expected);
		}

	});

});
