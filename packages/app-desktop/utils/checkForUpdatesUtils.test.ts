import { extractVersionInfo, Release, Platform, Architecture, GitHubRelease } from './checkForUpdatesUtils';
import { releases1, releases2 } from './checkForUpdatesUtilsTestData';

describe('checkForUpdates', () => {

	it('should extract version info and return the non-arm64 version', async () => {
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

		// Should match, even with uppercase .DMG.
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

});
