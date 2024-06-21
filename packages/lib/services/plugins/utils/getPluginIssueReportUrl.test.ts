import getPluginIssueReportUrl from './getPluginIssueReportUrl';

describe('getPluginIssueReportUrl', () => {
	test.each([
		[{ repository_url: 'http://github.com/laurent22/joplin' }, 'https://github.com/laurent22/joplin/issues'],
		[{ repository_url: 'https://www.github.com/laurent22/joplin' }, 'https://github.com/laurent22/joplin/issues'],
		[{ repository_url: 'https://www.github.com/laurent22/joplin.git' }, 'https://github.com/laurent22/joplin/issues'],
		[{ homepage_url: 'https://www.github.com/laurent22/joplin' }, 'https://github.com/laurent22/joplin/issues'],

		[{ homepage_url: 'https://gitlab.com/laurent22/joplin' }, 'https://gitlab.com/laurent22/joplin/-/issues'],
		[{ homepage_url: 'https://www.gitlab.com/laurent22/joplin' }, 'https://gitlab.com/laurent22/joplin/-/issues'],

		[{ homepage_url: 'https://example.com/laurent22/joplin' }, null],
	])('should return the issue URL (case %#)', async (manifest, expectedUrl) => {
		expect(getPluginIssueReportUrl(manifest)).toBe(expectedUrl);
	});
});
