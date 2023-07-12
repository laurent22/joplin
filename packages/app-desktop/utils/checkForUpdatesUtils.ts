import { fileExtension } from '@joplin/lib/path-utils';
import shim from '@joplin/lib/shim';

export interface CheckForUpdateOptions {
	includePreReleases?: boolean;
}

export interface GitHubRelease {
	tag_name: string;
	prerelease: boolean;
	body: string;
	assets: {
		name: string;
		browser_download_url: string;
	}[];
	html_url: string;
}

interface Release {
	version: string;
	prerelease: boolean;
	downloadUrl: string;
	notes: string;
	pageUrl: string;
}

function getMajorMinorTagName(tagName: string) {
	const s = tagName.split('.');
	s.pop();
	return s.join('.');
}

export const extractVersionInfo = (releases: GitHubRelease[], platform: typeof process.platform, options: CheckForUpdateOptions) => {
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

	let downloadUrl = null;
	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		let found = false;
		const ext = fileExtension(asset.name);
		if (platform === 'win32' && ext === 'exe') {
			if (shim.isPortable()) {
				found = asset.name === 'JoplinPortable.exe';
			} else {
				found = !!asset.name.match(/^Joplin-Setup-[\d.]+\.exe$/);
			}
		} else if (platform === 'darwin' && ext === 'dmg' && !asset.name.endsWith('arm64.dmg')) { // We don't return the arm64 version for now
			found = true;
		} else if (platform === 'linux' && ext === '.AppImage') {
			found = true;
		}

		if (found) {
			downloadUrl = asset.browser_download_url.replace('github.com/laurent22/joplin/releases/download', 'objects.joplinusercontent.com');
			downloadUrl.concat('?source=DesktopApp&type=Update');
			break;
		}
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
