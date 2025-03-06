
import path = require('path');
import { parseArgs } from 'util';
import { Context, downloadFileFromGitHub, getTargetRelease, updateReleaseAsset, uploadReleaseAsset } from './githubReleasesUtils';
import { GitHubRelease } from '../utils/checkForUpdatesUtils';
import { GenerateInfo, generateLatestArm64Yml } from './generateLatestArm64Yml';

const basePath = path.join(__dirname, '..');
const downloadDir = path.join(basePath, 'downloads');

// Renames release assets in Joplin Desktop releases
const renameReleaseAssets = async (context: Context, release: GitHubRelease) => {
	// Patterns used to rename releases
	const renamePatterns: [RegExp, string][] = [
		[/-arm64\.dmg$/, '-arm64.DMG'],
	];

	for (const asset of release.assets) {
		for (const [pattern, replacement] of renamePatterns) {
			if (asset.name.match(pattern)) {
				const newName = asset.name.replace(pattern, replacement);
				await updateReleaseAsset(context, asset.url, newName);
				asset.name = newName;

				// Only rename a release once.
				break;
			}
		}
	}
};

// Creates release assets in Joplin Desktop releases
const createReleaseAssets = async (context: Context, release: GitHubRelease) => {
	// Create latest-mac-arm64.yml file and publish
	let dmgPath: string;
	let zipPath: string;
	for (const asset of release.assets) {
		console.log(`Checking asset: ${asset.name}`);

		if (asset.name.endsWith('arm64.zip')) {
			zipPath = await downloadFileFromGitHub(context, asset, downloadDir);
		} else if (asset.name.endsWith('arm64.DMG')) {
			dmgPath = await downloadFileFromGitHub(context, asset, downloadDir);
		}
	}

	if (!zipPath || !dmgPath) {
		const formattedAssets = release.assets.map(asset => ({
			name: asset.name,
			url: asset.url,
		}));
		throw new Error(`Zip path: ${zipPath} and/or dmg path: ${dmgPath} are not defined. Logging assets of release: ${JSON.stringify(formattedAssets, null, 2)}`);
	}

	const info: GenerateInfo = {
		version: release.tag_name.slice(1),
		dmgPath: dmgPath,
		zipPath: zipPath,
		releaseDate: new Date().toISOString(),
	};

	const latestArm64FilePath = generateLatestArm64Yml(info, downloadDir);
	await uploadReleaseAsset(context, release, latestArm64FilePath);
};


const modifyReleaseAssets = async () => {
	const args = parseArgs({
		options: {
			tag: { type: 'string' },
			token: { type: 'string' },
			repo: { type: 'string' },
		},
	});

	if (!args.values.tag || !args.values.token || !args.values.repo) {
		throw new Error([
			'Required arguments: --tag, --token, --repo',
			'  --tag should be a git tag with an associated release (e.g. v12.12.12)',
			'  --token should be a GitHub API token',
			'  --repo should be a string in the form user/reponame (e.g. laurent22/joplin)',
		].join('\n'));
	}

	const context: Context = {
		repo: args.values.repo,
		githubToken: args.values.token,
		targetTag: args.values.tag,
	};

	const release = await getTargetRelease(context, context.targetTag);

	if (!release.assets) {
		console.log(release);
		throw new Error(`Release ${release.tag_name} missing assets!`);
	}

	console.log('Renaming release assets for tag', context.targetTag, context.repo);
	await renameReleaseAssets(context, release);
	console.log('Creating latest-mac-arm64.yml asset for tag', context.targetTag, context.repo);
	await createReleaseAssets(context, release);
};

void modifyReleaseAssets();
