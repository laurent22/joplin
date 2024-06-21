import * as fs from 'fs-extra';
import { fileExtension } from '@joplin/lib/path-utils';
import { gitHubLatestRelease, GitHubRelease } from './tool-utils';
const destMarkdownPath = `${__dirname}/../../readme/install.md`;

async function msleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(null);
		}, ms);
	});
}

export enum OS {
	MacOs = 'macos',
	MacOsM1 = 'macosm1',
	Windows = 'windows',
	Android = 'android',
	Android32 = 'android32',
	Linux = 'linux',
}

export const downloadUrl = (release: GitHubRelease, os: OS, portable = false) => {
	if (!release || !release.assets || !release.assets.length) return null;

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const name = asset.name;
		const ext = fileExtension(name);

		const githubAndroidUrl = 'github.com/laurent22/joplin-android/releases/download/android-';
		const githubUrl = 'github.com/laurent22/joplin/releases/download/';
		const joplinDomain = 'objects.joplinusercontent.com/';

		if (name.endsWith('arm64.DMG') && os === OS.MacOsM1) {
			return asset.browser_download_url.replace(githubUrl, joplinDomain);
		} else if (ext === 'dmg' && os === OS.MacOs) {
			return asset.browser_download_url.replace(githubUrl, joplinDomain);
		}

		if (ext === 'exe' && os === OS.Windows) {
			if (portable) {
				if (name === 'JoplinPortable.exe') return asset.browser_download_url.replace(githubUrl, joplinDomain);
			} else {
				if (name.match(/^Joplin-Setup-[\d.]+\.exe$/)) return asset.browser_download_url.replace(githubUrl, joplinDomain);
			}
		}

		if (ext === 'AppImage' && os === OS.Linux) return asset.browser_download_url.replace(githubUrl, joplinDomain);

		if (os === OS.Android32 && name.endsWith('32bit.apk')) return asset.browser_download_url.replace(githubAndroidUrl, joplinDomain);

		if (os === OS.Android && ext === 'apk' && !name.endsWith('32bit.apk')) return asset.browser_download_url.replace(githubAndroidUrl, joplinDomain);
	}

	throw new Error(`Could not find download URL for: ${os}`);
};

function readmeContent() {
	if (!fs.existsSync(destMarkdownPath)) throw new Error(`Cannot find ${destMarkdownPath}`);
	return fs.readFileSync(destMarkdownPath, 'utf8');
}

function setReadmeContent(content: string) {
	if (!fs.existsSync(destMarkdownPath)) throw new Error(`Cannot find ${destMarkdownPath}`);
	return fs.writeFileSync(destMarkdownPath, content);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function main(argv: any) {
	const waitForVersion = argv.length === 3 ? argv[2] : null;

	if (waitForVersion) console.info(`Waiting for version ${waitForVersion} to be released before updating readme...`);

	let release = null;
	while (true) {
		release = await gitHubLatestRelease('joplin');
		if (!waitForVersion) break;

		if (release.tag_name !== waitForVersion) {
			await msleep(60000 * 5);
		} else {
			console.info(`Got version ${waitForVersion}`);
			break;
		}
	}

	const androidRelease = await gitHubLatestRelease('joplin-android');

	const androidUrl = downloadUrl(androidRelease, OS.Android);
	const winUrl = downloadUrl(release, OS.Windows);
	const winPortableUrl = downloadUrl(release, OS.Windows, true);
	const macOsUrl = downloadUrl(release, OS.MacOs);
	const macOsM1Url = downloadUrl(release, OS.MacOsM1);
	const linuxUrl = downloadUrl(release, OS.Linux);

	console.info('Windows: ', winUrl);
	console.info('Windows Portable: ', winPortableUrl);
	console.info('macOS: ', macOsUrl);
	console.info('macOSM1: ', macOsM1Url);
	console.info('Linux: ', linuxUrl);
	console.info('Android: ', androidUrl);

	let content = readmeContent();

	if (winUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-Setup-.*?\.exe)/, winUrl);
	if (winPortableUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/JoplinPortable.exe)/, winPortableUrl);
	if (macOsUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-.*?\.dmg)/, macOsUrl);
	if (macOsM1Url) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-.*?arm64\.DMG)/, macOsM1Url);
	if (linuxUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-.*?\.AppImage)/, linuxUrl);
	if (androidUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/joplin-v\d+\.\d+\.\d+\.apk)/, androidUrl);

	setReadmeContent(content);
}

if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	main(process.argv).catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
