import * as fs from 'fs-extra';
import { fileExtension } from '@joplin/lib/path-utils';
import { gitHubLatestRelease, GitHubRelease } from './tool-utils';
const readmePath = `${__dirname}/../../README.md`;

async function msleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(null);
		}, ms);
	});
}

function downloadUrl(release: GitHubRelease, os: string, portable = false) {
	if (!release || !release.assets || !release.assets.length) return null;

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const name = asset.name;
		const ext = fileExtension(name);

		const githubAndroidUrl = 'github.com/laurent22/joplin-android/releases/download';
		const githubUrl = 'github.com/laurent22/joplin/releases/download';
		const joplinDomain = 'objects.joplinusercontent.com';

		if (ext === 'dmg' && os === 'macos') return asset.browser_download_url.replace(githubUrl, joplinDomain);

		if (ext === 'exe' && os === 'windows') {
			if (portable) {
				if (name === 'JoplinPortable.exe') return asset.browser_download_url.replace(githubUrl, joplinDomain);
			} else {
				if (name.match(/^Joplin-Setup-[\d.]+\.exe$/)) return asset.browser_download_url.replace(githubUrl, joplinDomain);
			}
		}

		if (ext === 'AppImage' && os === 'linux') return asset.browser_download_url.replace(githubUrl, joplinDomain);

		if (os === 'android32' && name.endsWith('32bit.apk')) return asset.browser_download_url.replace(githubAndroidUrl, joplinDomain);

		if (os === 'android' && ext === 'apk' && !name.endsWith('32bit.apk')) return asset.browser_download_url.replace(githubAndroidUrl, joplinDomain);
	}

	throw new Error(`Could not find download URL for: ${os}`);
}

function readmeContent() {
	if (!fs.existsSync(readmePath)) throw new Error(`Cannot find ${readmePath}`);
	return fs.readFileSync(readmePath, 'utf8');
}

function setReadmeContent(content: string) {
	if (!fs.existsSync(readmePath)) throw new Error(`Cannot find ${readmePath}`);
	return fs.writeFileSync(readmePath, content);
}

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

	const android32Url = downloadUrl(androidRelease, 'android32');
	const androidUrl = downloadUrl(androidRelease, 'android');
	const winUrl = downloadUrl(release, 'windows');
	const winPortableUrl = downloadUrl(release, 'windows', true);
	const macOsUrl = downloadUrl(release, 'macos');
	const linuxUrl = downloadUrl(release, 'linux');

	console.info('Windows: ', winUrl);
	console.info('Windows Portable: ', winPortableUrl);
	console.info('macOS: ', macOsUrl);
	console.info('Linux: ', linuxUrl);
	console.info('Android: ', androidUrl);
	console.info('Android 32: ', android32Url);

	let content = readmeContent();

	if (winUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-Setup-.*?\.exe)/, winUrl);
	if (winPortableUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/JoplinPortable.exe)/, winPortableUrl);
	if (macOsUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-.*?\.dmg)/, macOsUrl);
	if (linuxUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/v\d+\.\d+\.\d+\/Joplin-.*?\.AppImage)/, linuxUrl);

	// Disable for now due to broken /latest API end point, which returns a
	// version from 6 months ago.

	if (androidUrl) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/android-v\d+\.\d+\.\d+\/joplin-v\d+\.\d+\.\d+\.apk)/, androidUrl);
	if (android32Url) content = content.replace(/(https:\/\/objects.joplinusercontent.com\/android-v\d+\.\d+\.\d+\/joplin-v\d+\.\d+\.\d+-32bit\.apk)/, android32Url);

	setReadmeContent(content);

	// console.info("git pull && git add -A && git commit -m 'Update readme downloads' && git push")
}

main(process.argv).catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
