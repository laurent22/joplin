require('app-module-path').addPath(`${__dirname}/../ReactNativeClient`);

'use strict';

const fs = require('fs-extra');
const request = require('request');

const { fileExtension } = require('lib/path-utils.js');
const url = 'https://api.github.com/repos/laurent22/joplin/releases/latest';
const readmePath = `${__dirname}/../README.md`;

async function msleep(ms) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

async function gitHubLatestRelease() {
	return new Promise((resolve, reject) => {
		request.get({
			url: url,
			json: true,
			headers: { 'User-Agent': 'Joplin Readme Updater' },
		}, (error, response, data) => {
			if (error) {
				reject(error);
			} else if (response.statusCode !== 200) {
				console.warn(data);
				reject(new Error(`Error HTTP ${response.statusCode}`));
			} else {
				resolve(data);
			}
		});
	});
}

function downloadUrl(release, os, portable = false) {
	if (!release || !release.assets || !release.assets.length) return null;

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const name = asset.name;
		const ext = fileExtension(name);

		if (ext === 'dmg' && os === 'macos') return asset.browser_download_url;
		if (ext === 'exe' && os === 'windows') {
			if (portable) {
				if (name === 'JoplinPortable.exe') return asset.browser_download_url;
			} else {
				if (name.match(/^Joplin-Setup-[\d.]+\.exe$/)) return asset.browser_download_url;
			}
		}
		if (ext === 'AppImage' && os === 'linux') return asset.browser_download_url;
	}
}

function readmeContent() {
	if (!fs.existsSync(readmePath)) throw new Error(`Cannot find ${readmePath}`);
	return fs.readFileSync(readmePath, 'utf8');
}

function setReadmeContent(content) {
	if (!fs.existsSync(readmePath)) throw new Error(`Cannot find ${readmePath}`);
	return fs.writeFileSync(readmePath, content);
}

async function main(argv) {
	const waitForVersion = argv.length === 3 ? argv[2] : null;

	if (waitForVersion) console.info(`Waiting for version ${waitForVersion} to be released before updating readme...`);

	let release = null;
	while (true) {
		release = await gitHubLatestRelease();
		if (!waitForVersion) break;

		if (release.tag_name !== waitForVersion) {
			await msleep(60000 * 5);
		} else {
			console.info(`Got version ${waitForVersion}`);
			break;
		}
	}

	const winUrl = downloadUrl(release, 'windows');
	const winPortableUrl = downloadUrl(release, 'windows', true);
	const macOsUrl = downloadUrl(release, 'macos');
	const linuxUrl = downloadUrl(release, 'linux');

	console.info('Windows: ', winUrl);
	console.info('Windows Portable: ', winPortableUrl);
	console.info('macOS: ', macOsUrl);
	console.info('Linux: ', linuxUrl);

	let content = readmeContent();

	if (winUrl) content = content.replace(/(https:\/\/github.com\/laurent22\/joplin\/releases\/download\/v\d+\.\d+\.\d+\/Joplin-Setup-.*?\.exe)/, winUrl);
	if (winPortableUrl) content = content.replace(/(https:\/\/github.com\/laurent22\/joplin\/releases\/download\/v\d+\.\d+\.\d+\/JoplinPortable.exe)/, winPortableUrl);
	if (macOsUrl) content = content.replace(/(https:\/\/github.com\/laurent22\/joplin\/releases\/download\/v\d+\.\d+\.\d+\/Joplin-.*?\.dmg)/, macOsUrl);
	if (linuxUrl) content = content.replace(/(https:\/\/github.com\/laurent22\/joplin\/releases\/download\/v\d+\.\d+\.\d+\/Joplin-.*?\.AppImage)/, linuxUrl);

	setReadmeContent(content);

	// console.info("git pull && git add -A && git commit -m 'Update readme downloads' && git push")
}

main(process.argv).catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
