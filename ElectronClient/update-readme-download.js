'use strict';

const fs = require('fs-extra');
const https = require('https');
const request = require('request');

const url = 'https://api.github.com/repos/laurent22/joplin/releases/latest';

async function gitHubLatestRelease() {
	return new Promise((resolve, reject) => {
		request.get({
			url: url,
			json: true,
			headers: {'User-Agent': 'Joplin Readme Updater'}
		}, (error, response, data) => {
			if (err) {
				reject(error);
			} else if (response.statusCode !== 200) {
				reject(new Error('Error HTTP ' + response.statusCode));
			} else {
				resolve(data);
			}
		});
	});
}

function downloadUrl(release, os) {
	if (!release || !release.assets || !release.assets.length) return null;

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const name = asset.name;

		if (name.indexOf('.dmg') > 0 && os === 'macos') return asset.browser_download_url; 
	}
}

async function main() {
	const release = await gitHubLatestRelease();
	console.info(downloadUrl(release, 'windows'));
	console.info(downloadUrl(release, 'macos'));
	console.info(downloadUrl(release, 'linux'));
}

main().catch((error) => {
	console.error('Fatal error', error);
});