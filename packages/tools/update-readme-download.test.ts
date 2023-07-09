import { GitHubRelease } from './tool-utils';
import { downloadUrl, OS } from './update-readme-download';

describe('update-readme-download', () => {

	it('convert download URLs', async () => {
		const createRelease = (assetName: string, browserDownloadUrl: string) => {
			const r: GitHubRelease = {
				assets: [
					{
						browser_download_url: browserDownloadUrl,
						name: assetName,
					},
				],
				tag_name: '',
				upload_url: '',
				html_url: '',
				prerelease: false,
				draft: false,
			};
			return r;
		};

		const testCases: [GitHubRelease, OS, boolean, string][] = [
			[
				createRelease('joplin-v2.9.8.apk', 'https://github.com/laurent22/joplin-android/releases/download/android-v2.9.8/joplin-v2.9.8.apk'),
				OS.Android,
				false,
				'https://objects.joplinusercontent.com/v2.9.8/joplin-v2.9.8.apk',
			],
			[
				createRelease('Joplin-Setup-2.11.11.exe', 'https://github.com/laurent22/joplin/releases/download/v2.11.11/Joplin-Setup-2.11.11.exe'),
				OS.Windows,
				false,
				'https://objects.joplinusercontent.com/v2.11.11/Joplin-Setup-2.11.11.exe',
			],
			[
				createRelease('JoplinPortable.exe', 'https://github.com/laurent22/joplin/releases/download/v2.11.11/JoplinPortable.exe'),
				OS.Windows,
				true,
				'https://objects.joplinusercontent.com/v2.11.11/JoplinPortable.exe',
			],
		];

		for (const [release, os, portable, expected] of testCases) {
			const actual = downloadUrl(release, os, portable);
			expect(actual).toBe(expected);
		}
	});

});
