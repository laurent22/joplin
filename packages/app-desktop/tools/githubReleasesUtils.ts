import * as fs from 'fs';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { GitHubRelease, GitHubReleaseAsset } from '../utils/checkForUpdatesUtils';

export interface Context {
	repo: string; // {owner}/{repo}
	githubToken: string;
	targetTag: string;
}

const apiBaseUrl = 'https://api.github.com/repos/';
const defaultApiHeaders = (context: Context) => ({
	'User-Agent': 'Joplin',
	'Authorization': `token ${context.githubToken}`,
	'X-GitHub-Api-Version': '2022-11-28',
	'Accept': 'application/vnd.github+json',
});

export const getTargetRelease = async (context: Context, targetTag: string): Promise<GitHubRelease> => {
	console.log('Fetching releases...');

	// Note: We need to fetch all releases, not just /releases/tag/tag-name-here.
	// The latter doesn't include draft releases.

	const result = await fetch(`${apiBaseUrl}${context.repo}/releases`, {
		method: 'GET',
		headers: defaultApiHeaders(context),
	});

	const releases = await result.json();
	if (!result.ok) {
		throw new Error(`Error fetching release: ${JSON.stringify(releases)}`);
	}

	for (const release of releases) {
		if (release.tag_name === targetTag) {
			return release;
		}
	}

	throw new Error(`No release with tag ${targetTag} found!`);
};

// Download a file from Joplin Desktop releases
export const downloadFileFromGitHub = async (context: Context, asset: GitHubReleaseAsset, destinationDir: string) => {
	const downloadPath = path.join(destinationDir, asset.name);
	if (!fs.existsSync(destinationDir)) {
		fs.mkdirSync(destinationDir);
	}

	/* eslint-disable no-console */
	console.log(`Downloading ${asset.name} from ${asset.url} to ${downloadPath}`);
	try {
		const response = await axios({
			method: 'get',
			url: asset.url,
			responseType: 'stream',
			headers: {
				...defaultApiHeaders(context),
				'Accept': 'application/octet-stream',
			},
		});

		if (response.status < 200 || response.status >= 300) {
			throw new Error(`Failed to download file: Status Code ${response.status}`);
		}

		await pipeline(response.data, createWriteStream(downloadPath));
		console.log('Download successful!');
		/* eslint-enable no-console */
		return downloadPath;
	} catch (error) {
		throw new Error('Download not successful.');
	}
};

export const updateReleaseAsset = async (context: Context, assetUrl: string, newName: string) => {
	console.log('Updating asset with URL', assetUrl, 'to have name, ', newName);

	// See https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28#update-a-release-asset
	const result = await fetch(assetUrl, {
		method: 'PATCH',
		headers: defaultApiHeaders(context),
		body: JSON.stringify({
			name: newName,
		}),
	});

	if (!result.ok) {
		throw new Error(`Unable to update release asset: ${await result.text()}`);
	}
};

export const uploadReleaseAsset = async (context: Context, release: GitHubRelease, filePath: string): Promise<void> => {
	console.log(`Uploading file from ${filePath} to release ${release.tag_name}`);

	const fileContent = fs.readFileSync(filePath);
	const fileName = path.basename(filePath);
	const uploadUrl = `https://uploads.github.com/repos/${context.repo}/releases/${release.id}/assets?name=${encodeURIComponent(fileName)}`;

	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: {
			...defaultApiHeaders(context),
			'Content-Type': 'application/octet-stream',
		},
		body: fileContent,
	});

	if (!response.ok) {
		throw new Error(`Failed to upload asset: ${await response.text()}`);
	} else {
		console.log(`${fileName} uploaded successfully.`);
	}
};
