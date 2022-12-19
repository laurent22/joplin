import { githubOauthToken } from '@joplin/tools/tool-utils';
import { pathExists, readdir, readFile, stat, writeFile } from 'fs-extra';

// We need to require `.default` due to this issue:
// https://github.com/node-fetch/node-fetch/issues/450#issuecomment-387045223
const fetch = require('node-fetch').default;

const ghReleaseAssets = require('gh-release-assets');

const apiBaseUrl = 'https://api.github.com/repos/joplin/plugins';

interface Args {
	pluginRepoDir: string;
	dryRun: boolean;
}

interface PluginInfo {
	id: string;
	version: string;
	path?: string;
}

interface ReleaseAsset {
	id: number;
	name: string;
	download_count: number;
	created_at: string;
}

interface Release {
	upload_url: string;
	html_url: string;
	assets: ReleaseAsset[];
}

async function getRelease(): Promise<Release> {
	const response = await fetch(`${apiBaseUrl}/releases`);
	const releases = await response.json();
	if (!releases.length) throw new Error('No existing release');
	return releases[0];
}

async function getPluginInfos(pluginRepoDir: string): Promise<PluginInfo[]> {
	const pluginDirs = await readdir(`${pluginRepoDir}/plugins`);
	const output: PluginInfo[] = [];

	for (const pluginDir of pluginDirs) {
		const basePath = `${pluginRepoDir}/plugins/${pluginDir}`;
		if (!(await stat(basePath)).isDirectory()) continue;

		const manifest = JSON.parse(await readFile(`${basePath}/manifest.json`, 'utf8'));
		output.push({
			id: manifest.id,
			version: manifest.version,
			path: `${basePath}/plugin.jpl`,
		});
	}

	return output;
}

function assetNameFromPluginInfo(pluginInfo: PluginInfo): string {
	return `${pluginInfo.id}@${pluginInfo.version}.jpl`;
}

function pluginInfoFromAssetName(name: string): PluginInfo {
	let s = name.split('.');
	s.pop();
	s = s.join('.').split('@');
	return {
		id: s[0],
		version: s[1],
	};
}

async function deleteAsset(oauthToken: string, id: number) {
	await fetch(`${apiBaseUrl}/releases/assets/${id}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `token ${oauthToken}`,
		},
	});
}

async function uploadAsset(oauthToken: string, uploadUrl: string, pluginInfo: PluginInfo) {
	return new Promise((resolve: Function, reject: Function) => {
		ghReleaseAssets({
			url: uploadUrl,
			token: oauthToken,
			assets: [
				{
					name: assetNameFromPluginInfo(pluginInfo),
					path: pluginInfo.path,
				},
			],
		}, (error: Error, assets: any) => {
			if (error) {
				reject(error);
			} else {
				resolve(assets);
			}
		});
	});
}

async function createStats(statFilePath: string, release: Release) {
	const output: Record<string, any> = await pathExists(statFilePath) ? JSON.parse(await readFile(statFilePath, 'utf8')) : {};

	if (release.assets) {
		for (const asset of release.assets) {
			const pluginInfo = pluginInfoFromAssetName(asset.name);
			if (!output[pluginInfo.id]) output[pluginInfo.id] = {};

			output[pluginInfo.id][pluginInfo.version] = {
				downloadCount: asset.download_count,
				createdAt: asset.created_at,
			};
		}
	}

	return output;
}

async function saveStats(statFilePath: string, stats: any) {
	await writeFile(statFilePath, JSON.stringify(stats, null, '\t'));
}

export default async function(args: Args) {
	const release = await getRelease();
	console.info(`Got release with ${release.assets.length} assets from ${release.html_url}`);

	const statFilePath = `${args.pluginRepoDir}/stats.json`;
	const stats = await createStats(statFilePath, release);

	// We save the stats:
	// - If the stat file doesn't exist
	// - Or every x hours
	// - Or before deleting an asset (so that we preserve the number of times a
	//   particular version of a plugin has been downloaded).
	let statSaved = false;
	async function doSaveStats() {
		if (statSaved) return;
		console.info('Updating stats file...');
		await saveStats(statFilePath, stats);
		statSaved = true;
	}

	if (!(await pathExists(statFilePath))) {
		await doSaveStats();
	} else {
		const fileInfo = await stat(statFilePath);
		if (Date.now() - fileInfo.mtime.getTime() >= 7 * 24 * 60 * 60 * 1000) {
			await doSaveStats();
		}
	}

	const pluginInfos = await getPluginInfos(args.pluginRepoDir);
	const oauthToken = await githubOauthToken();

	for (const pluginInfo of pluginInfos) {
		const assetName = assetNameFromPluginInfo(pluginInfo);

		const otherVersionAssets = release.assets.filter(asset => {
			const info = pluginInfoFromAssetName(asset.name);
			return info.id === pluginInfo.id && info.version !== pluginInfo.version;
		});

		for (const asset of otherVersionAssets) {
			console.info(`Deleting old asset ${asset.name}...`);
			await doSaveStats();
			await deleteAsset(oauthToken, asset.id);
		}

		const existingAsset = release.assets.find(asset => asset.name === assetName);
		if (existingAsset) continue;
		console.info(`Uploading ${assetName}...`);
		await uploadAsset(oauthToken, release.upload_url, pluginInfo);
	}
}
