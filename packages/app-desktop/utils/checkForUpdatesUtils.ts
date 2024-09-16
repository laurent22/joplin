import { fileExtension } from '@joplin/lib/path-utils';

export interface CheckForUpdateOptions {
	includePreReleases?: boolean;
}

export interface GitHubReleaseAsset {
	name: string;
	browser_download_url: string;
	url?: string;
}

export interface GitHubRelease {
	id?: string;
	tag_name: string;
	prerelease: boolean;
	body: string;
	assets: GitHubReleaseAsset[];
	html_url: string;
}

export interface Release {
	version: string;
	prerelease: boolean;
	downloadUrl: string;
	notes: string;
	pageUrl: string;
}

export type Platform = typeof process.platform;

export type Architecture = typeof process.arch;

function getMajorMinorTagName(tagName: string) {
	const s = tagName.split('.');
	s.pop();
	return s.join('.');
}

export const extractVersionInfo = (releases: GitHubRelease[], platform: Platform, arch: Architecture, portable: boolean, options: CheckForUpdateOptions) => {
	options = { includePreReleases: false, ...options };

	if (!releases.length) throw new Error('Cannot get latest release info (JSON)');

	let release = null;

	if (options.includePreReleases) {
		release = releases[0];
	} else {
		for (const r of releases) {
			if (!r.prerelease) {
				release = r;
				break;
			}
		}
	}

	if (!release) throw new Error('Could not get tag name');

	const version = release.tag_name.substr(1);

	// We concatenate all the release notes of the major/minor versions
	// corresponding to the latest version. For example, if the latest version
	// is 1.8.3, we concatenate all the 1.8.x versions. This is so that no
	// matter from which version you upgrade, you always see the full changes,
	// with the latest changes being on top.

	const fullReleaseNotes = [];
	const majorMinorTagName = getMajorMinorTagName(release.tag_name);

	for (const release of releases) {
		if (getMajorMinorTagName(release.tag_name) === majorMinorTagName) {
			fullReleaseNotes.push(release.body.trim());
		}
	}

	let foundAsset: GitHubReleaseAsset = null;

	if (platform === 'win32' && portable) {
		foundAsset = release.assets.find(asset => {
			return asset.name === 'JoplinPortable.exe';
		});
	}

	if (!foundAsset && platform === 'win32') {
		foundAsset = release.assets.find(asset => {
			return !!asset.name.match(/^Joplin-Setup-[\d.]+\.exe$/);
		});
	}

	const arm64DMGPattern = /arm64\.(dmg|DMG)$/;
	if (platform === 'darwin' && arch === 'arm64') {
		foundAsset = release.assets.find(asset => {
			return asset.name.match(arm64DMGPattern);
		});
	}

	if (!foundAsset && platform === 'darwin') {
		foundAsset = release.assets.find(asset => {
			return fileExtension(asset.name) === 'dmg' && !asset.name.match(arm64DMGPattern);
		});
	}
	if (platform === 'linux') {
		foundAsset = release.assets.find(asset => {
			return fileExtension(asset.name) === 'AppImage';
		});
	}

	let downloadUrl: string = null;

	if (foundAsset) {
		downloadUrl = foundAsset.browser_download_url.replace('github.com/laurent22/joplin/releases/download', 'objects.joplinusercontent.com');
		downloadUrl.concat('?source=DesktopApp&type=Update');
	}

	function cleanUpReleaseNotes(releaseNotes: string[]) {
		const lines = releaseNotes.join('\n\n* * *\n\n').split('\n');
		const output = [];
		for (const line of lines) {
			const r = line
				.replace(/\(#.* by .*\)/g, '') // Removes issue numbers and names - (#3157 by [@user](https://github.com/user))
				.replace(/\([0-9a-z]{7}\)/g, '') // Removes commits - "sync state or data (a6caa35)"
				.replace(/\(#[0-9]+\)/g, '') // Removes issue numbers - "(#4727)"
				.replace(/ {2}/g, ' ')
				.trim();

			output.push(r);
		}
		return output.join('\n');
	}

	const output: Release = {
		version: version,
		downloadUrl: downloadUrl,
		notes: cleanUpReleaseNotes(fullReleaseNotes),
		pageUrl: release.html_url,
		prerelease: release.prerelease,
	};

	return output;
};
