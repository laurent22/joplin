import { extractVersionInfo, extractMediaUrl, Release, Platform, Architecture, GitHubRelease } from './checkForUpdatesUtils';
import { releases1, releases2 } from './checkForUpdatesUtilsTestData';

describe('checkForUpdates', () => {

	it('should extract version info and return the non-arm64 version', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const testCases: [any, Platform, Architecture, boolean, Release][] = [
			[
				releases1,
				'darwin',
				'x64',
				false,
				{
					downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/Joplin-2.12.4.dmg',
					prerelease: true,
					pageUrl: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
					version: '2.12.4',
					notes: '',
				},
			],

			[
				releases1,
				'darwin',
				'arm64',
				false,
				{
					downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/Joplin-2.12.4-arm64.dmg',
					prerelease: true,
					pageUrl: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
					version: '2.12.4',
					notes: '',
				},
			],

			// Case where we are on macOS ARM64, but no ARM64 version is
			// available. In that case, we default to the regular DMG version.
			[
				releases2,
				'darwin',
				'arm64',
				false,
				{
					downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/Joplin-2.12.4.dmg',
					prerelease: true,
					pageUrl: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
					version: '2.12.4',
					notes: '',
				},
			],

			[
				releases1,
				'linux',
				'x64',
				false,
				{
					downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/Joplin-2.12.4.AppImage',
					prerelease: true,
					pageUrl: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
					version: '2.12.4',
					notes: '',
				},
			],

			[
				releases1,
				'win32',
				'x64',
				true,
				{
					downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/JoplinPortable.exe',
					prerelease: true,
					pageUrl: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
					version: '2.12.4',
					notes: '',
				},
			],

			[
				releases1,
				'win32',
				'x64',
				false,
				{
					downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/Joplin-Setup-2.12.4.exe',
					prerelease: true,
					pageUrl: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
					version: '2.12.4',
					notes: '',
				},
			],
		];

		for (const [releases, platform, arch, portable, expected] of testCases) {
			const actual = extractVersionInfo(releases, platform, arch, portable, {
				includePreReleases: true,
			});

			expect(actual.downloadUrl).toBe(expected.downloadUrl);
			expect(actual.prerelease).toBe(expected.prerelease);
			expect(actual.pageUrl).toBe(expected.pageUrl);
			expect(actual.version).toBe(expected.version);
		}
	});

	it('macOS should match both .DMG and .dmg extensions', () => {
		// A .DMG may be used to prevent older versions of Joplin from downloading an incompatible
		// release. Ensure that newer versions of Joplin can download these releases.
		const releaseDataWithExtension = (extension: string) => {
			const downloadURL = `https://github.com/laurent22/joplin/releases/download/v2.12.4/Joplin-2.12.4${extension}`;
			const releaseData: GitHubRelease = {
				prerelease: false,
				body: 'this is a test',
				tag_name: 'v2.12.4',
				assets: [
					{
						name: `Joplin-2.12.4${extension}`,
						browser_download_url: downloadURL,
					},
				],
				html_url: 'https://github.com/laurent22/joplin/releases/tag/v2.12.4',
			};

			return releaseData;
		};

		const releaseData = releaseDataWithExtension('-arm64.DMG');
		const releaseInfo = extractVersionInfo([releaseData], 'darwin', 'arm64', false, { });

		// Should match, with uppercase .DMG
		expect(releaseInfo).toMatchObject({
			version: '2.12.4',
			downloadUrl: 'https://objects.joplinusercontent.com/v2.12.4/Joplin-2.12.4-arm64.DMG',
			pageUrl: releaseData.html_url,
			prerelease: releaseData.prerelease,
		});

		// Should not match when the extension is invalid
		expect(
			extractVersionInfo([releaseDataWithExtension('-arm64.dmG')], 'darwin', 'arm64', false, { }),
		).toMatchObject({
			version: '2.12.4',
			downloadUrl: null,
			pageUrl: releaseData.html_url,
			prerelease: releaseData.prerelease,
		});
	});

	it('should extract Twitter media URL from release body', () => {
		const body = 'Release notes here\n\nSee: https://twitter.com/joplinapp/status/123456';
		expect(extractMediaUrl(body)).toBe('https://twitter.com/joplinapp/status/123456');
	});

	it('should extract X.com media URL from release body', () => {
		const body = 'Check out https://x.com/joplinapp/status/789012 for details';
		expect(extractMediaUrl(body)).toBe('https://x.com/joplinapp/status/789012');
	});

	it('should extract YouTube media URL from release body', () => {
		const body = 'Watch the video: https://www.youtube.com/watch?v=abc-123';
		expect(extractMediaUrl(body)).toBe('https://www.youtube.com/watch?v=abc-123');
	});

	it('should extract short YouTube media URL from release body', () => {
		const body = 'Video: https://youtu.be/abc-123';
		expect(extractMediaUrl(body)).toBe('https://youtu.be/abc-123');
	});

	it('should return undefined when no media URL is in release body', () => {
		const body = 'Release notes without media links\n- Fixed bug\n- Added feature';
		expect(extractMediaUrl(body)).toBeUndefined();
	});

	it('should include mediaUrl in extractVersionInfo when present', () => {
		const releaseData: GitHubRelease = {
			tag_name: 'v3.0.0',
			prerelease: false,
			body: 'Release notes\n\nhttps://twitter.com/joplinapp/status/999',
			assets: [
				{
					name: 'Joplin-3.0.0.dmg',
					browser_download_url: 'https://github.com/laurent22/joplin/releases/download/v3.0.0/Joplin-3.0.0.dmg',
				},
			],
			html_url: 'https://github.com/laurent22/joplin/releases/tag/v3.0.0',
		};
		const result = extractVersionInfo([releaseData], 'darwin', 'x64', false, {});
		expect(result.mediaUrl).toBe('https://twitter.com/joplinapp/status/999');
	});

	it('should have undefined mediaUrl when none present in release body', () => {
		const releaseData: GitHubRelease = {
			tag_name: 'v3.0.0',
			prerelease: false,
			body: 'Simple release notes without media',
			assets: [
				{
					name: 'Joplin-3.0.0.dmg',
					browser_download_url: 'https://github.com/laurent22/joplin/releases/download/v3.0.0/Joplin-3.0.0.dmg',
				},
			],
			html_url: 'https://github.com/laurent22/joplin/releases/tag/v3.0.0',
		};
		const result = extractVersionInfo([releaseData], 'darwin', 'x64', false, {});
		expect(result.mediaUrl).toBeUndefined();
	});

});
