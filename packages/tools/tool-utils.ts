import { pathExists, readFile, writeFile, unlink, stat, createWriteStream } from 'fs-extra';
import { hasCredentialFile, readCredentialFile } from '@joplin/lib/utils/credentialFiles';
import { execCommand as execCommand2, commandToString } from '@joplin/utils';

const fetch = require('node-fetch');
const execa = require('execa');
const moment = require('moment');

export interface GitHubReleaseAsset {
	name: string;
	browser_download_url: string;
}

export interface GitHubRelease {
	assets: GitHubReleaseAsset[];
	tag_name: string;
	upload_url: string;
	html_url: string;
	prerelease: boolean;
	draft: boolean;
	body: string;
}

async function insertChangelog(tag: string, changelogPath: string, changelog: string, isPrerelease: boolean, repoTagUrl = '') {
	repoTagUrl = repoTagUrl || 'https://github.com/laurent22/joplin/releases/tag';

	const currentText = await readFile(changelogPath, 'utf8');
	const lines = currentText.split('\n');

	const beforeLines = [];
	const afterLines = [];

	for (const line of lines) {
		if (afterLines.length) {
			afterLines.push(line);
			continue;
		}

		if (line.indexOf('##') === 0) {
			afterLines.push(line);
			continue;
		}

		beforeLines.push(line);
	}

	const header = [
		'##',
		`[${tag}](${repoTagUrl}/${tag})`,
	];
	if (isPrerelease) header.push('(Pre-release)');
	header.push('-');
	// eslint-disable-next-line no-useless-escape
	header.push(`${moment.utc().format('YYYY-MM-DD\THH:mm:ss')}Z`);

	let newLines = [];
	newLines.push(header.join(' '));
	newLines.push('');
	newLines = newLines.concat(changelog.split('\n'));
	newLines.push('');

	const output = beforeLines.concat(newLines).concat(afterLines);

	return output.join('\n');
}

export function releaseFinalGitCommands(appName: string, newVersion: string, newTag: string): string {
	const finalCmds = [
		'git add -A',
		`git commit -m "${appName} ${newVersion}"`,
		`git tag "${newTag}"`,
		'git push',
		`git push origin refs/tags/${newTag}`,
	];

	return finalCmds.join(' && ');
}

export async function completeReleaseWithChangelog(changelogPath: string, newVersion: string, newTag: string, appName: string, isPreRelease: boolean, repoTagUrl = '') {
	const changelog = (await execCommand2(`node ${rootDir}/packages/tools/git-changelog ${newTag} --publish-format full`, { showStdout: false })).trim();

	const newChangelog = await insertChangelog(newTag, changelogPath, changelog, isPreRelease, repoTagUrl);

	await writeFile(changelogPath, newChangelog);

	console.info('');
	console.info('Verify that the changelog is correct:');
	console.info('');
	console.info(`${process.env.EDITOR} "${changelogPath}"`);
	console.info('');
	console.info('Then run these commands:');
	console.info('');
	console.info(releaseFinalGitCommands(appName, newVersion, newTag));
}

async function loadGitHubUsernameCache() {
	const path = `${__dirname}/github_username_cache.json`;

	if (await pathExists(path)) {
		const jsonString = await readFile(path, 'utf8');
		return JSON.parse(jsonString);
	}

	return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function saveGitHubUsernameCache(cache: any) {
	const path = `${__dirname}/github_username_cache.json`;
	await writeFile(path, JSON.stringify(cache));
}

// Returns the project root dir
export const rootDir: string = require('path').dirname(require('path').dirname(__dirname));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function execCommand(command: string, options: any = null): Promise<string> {
	options = options || {};

	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		exec(command, options, (error: any, stdout: any, stderr: any) => {
			if (error) {
				if (error.signal === 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve([stdout.trim(), stderr.trim()].join('\n'));
			}
		});
	});
}

export function resolveRelativePathWithinDir(baseDir: string, ...relativePath: string[]): string {
	const path = require('path');
	const resolvedBaseDir = path.resolve(baseDir);
	const resolvedPath = path.resolve(baseDir, ...relativePath);
	if (resolvedPath.indexOf(resolvedBaseDir) !== 0) throw new Error(`Resolved path for relative path "${JSON.stringify(relativePath)}" is not within base directory "${baseDir}" (Was resolved to ${resolvedPath})`);
	return resolvedPath;
}

export function execCommandVerbose(commandName: string, args: string[] = []) {
	console.info(`> ${commandToString(commandName, args)}`);
	const promise = execa(commandName, args);
	promise.stdout.pipe(process.stdout);
	return promise;
}

export function execCommandWithPipes(executable: string, args: string[]) {
	const spawn = require('child_process').spawn;

	return new Promise((resolve, reject) => {
		const child = spawn(executable, args, { stdio: 'inherit' });

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		child.on('error', (error: any) => {
			reject(error);
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		child.on('close', (code: any) => {
			if (code !== 0) {
				reject(new Error(`Ended with code ${code}`));
			} else {
				resolve(null);
			}
		});
	});
}

export function toSystemSlashes(path: string) {
	const os = process.platform;
	if (os === 'win32') return path.replace(/\//g, '\\');
	return path.replace(/\\/g, '/');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function setPackagePrivateField(filePath: string, value: any) {
	const text = await readFile(filePath, 'utf8');
	const obj = JSON.parse(text);
	if (!value) {
		delete obj.private;
	} else {
		obj.private = true;
	}
	await writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

export async function downloadFile(url: string, targetPath: string) {
	const https = require('https');

	return new Promise((resolve, reject) => {
		const file = createWriteStream(targetPath);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		https.get(url, (response: any) => {
			if (response.statusCode !== 200) reject(new Error(`HTTP error ${response.statusCode}`));
			response.pipe(file);
			file.on('finish', () => {
				// file.close();
				resolve(null);
			});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		}).on('error', (error: any) => {
			reject(error);
		});
	});
}

export function fileSha256(filePath: string) {
	return new Promise((resolve, reject) => {
		const crypto = require('crypto');
		const fs = require('fs');
		const algo = 'sha256';
		const shasum = crypto.createHash(algo);

		const s = fs.ReadStream(filePath);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		s.on('data', (d: any) => { shasum.update(d); });
		s.on('end', () => {
			const d = shasum.digest('hex');
			resolve(d);
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		s.on('error', (error: any) => {
			reject(error);
		});
	});
}

export async function unlinkForce(filePath: string) {
	try {
		await unlink(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') return;
		throw error;
	}
}

export function fileExists(filePath: string) {
	return new Promise((resolve, reject) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		stat(filePath, (error: any) => {
			if (!error) {
				resolve(true);
			} else if (error.code === 'ENOENT') {
				resolve(false);
			} else {
				reject(error);
			}
		});
	});
}


export async function gitRepoClean(): Promise<boolean> {
	const output = await execCommand2('git status --porcelain', { quiet: true });
	return !output.trim();
}


export async function gitRepoCleanTry() {
	if (!(await gitRepoClean())) throw new Error(`There are pending changes in the repository: ${process.cwd()}`);
}

export async function gitPullTry(ignoreIfNotBranch = true) {
	try {
		await execCommand('git pull');
	} catch (error) {
		if (ignoreIfNotBranch && error.message.includes('no tracking information for the current branch')) {
			console.info('Skipping git pull because no tracking information on current branch');
		} else {
			throw error;
		}
	}
}

export const gitCurrentBranch = async (): Promise<string> => {
	const output = await execCommand2('git rev-parse --abbrev-ref HEAD', { quiet: true });
	return output.trim();
};

export async function githubUsername(email: string, name: string) {
	if (email.endsWith('@users.noreply.github.com')) {
		const splitted = email.split('@')[0].split('+');
		return splitted.length === 1 ? splitted[0] : splitted[1];
	}

	const cache = await loadGitHubUsernameCache();
	const cacheKey = `${email}:${name}`;
	if (cacheKey in cache) return cache[cacheKey];

	let output = null;

	const oauthToken = await githubOauthToken();

	const urlsToTry = [
		`https://api.github.com/search/users?q=${encodeURI(email)}+in:email`,

		// Note that this can fail if the email could not be found and the user
		// shares a name with someone else. It's rare enough that we can leave
		// it for now.
		// https://github.com/laurent22/joplin/pull/5390
		`https://api.github.com/search/users?q=user:${encodeURI(name)}`,
	];

	for (const url of urlsToTry) {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `token ${oauthToken}`,
			},
		});

		const responseText = await response.text();

		if (!response.ok) continue;

		const responseJson = JSON.parse(responseText);
		if (!responseJson || !responseJson.items || responseJson.items.length !== 1) continue;

		output = responseJson.items[0].login;
		break;
	}

	cache[cacheKey] = output;
	await saveGitHubUsernameCache(cache);

	return output;
}

export function patreonOauthToken() {
	return readCredentialFile('patreon_oauth_token.txt');
}

export function githubOauthToken() {
	const filename = 'github_oauth_token.txt';
	if (hasCredentialFile(filename)) return readCredentialFile(filename);
	if (process.env.JOPLIN_GITHUB_OAUTH_TOKEN) return process.env.JOPLIN_GITHUB_OAUTH_TOKEN;
	throw new Error(`Cannot get Oauth token. Neither ${filename} nor the env variable JOPLIN_GITHUB_OAUTH_TOKEN are present`);
}

// Note that the GitHub API releases/latest is broken on the joplin-android repo
// as of Nov 2021 (last working on 3 November 2021, first broken on 19
// November). It used to return the latest **published** release but now it
// returns... some release, always the same one, but not the latest one. GitHub
// says that nothing has changed on the API, although it used to work. So since
// we can't use /latest anymore, we need to fetch all the releases to find the
// latest published one.
//
// As of July 2023 /latest seems to be working again, so switching back to this
// method, but let's keep the old method just in case they break the API again.
export async function gitHubLatestRelease(repoName: string): Promise<GitHubRelease> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const response: any = await fetch(`https://api.github.com/repos/laurent22/${repoName}/releases/latest`, {
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'Joplin Readme Updater',
		},
	});

	if (!response.ok) throw new Error(`Cannot fetch releases: ${response.statusText}`);

	return response.json();
}

export async function gitHubLatestRelease_KeepInCaseMicrosoftBreaksTheApiAgain(repoName: string): Promise<GitHubRelease> {
	let pageNum = 1;

	while (true) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const response: any = await fetch(`https://api.github.com/repos/laurent22/${repoName}/releases?page=${pageNum}`, {
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'Joplin Readme Updater',
			},
		});

		if (!response.ok) throw new Error(`Cannot fetch releases: ${response.statusText}`);

		const releases = await response.json();
		if (!releases.length) throw new Error('Cannot find latest release');

		for (const release of releases) {
			if (release.prerelease || release.draft) continue;
			return release;
		}

		pageNum++;
	}
}

export const gitHubLatestReleases = async (page: number, perPage: number) => {
	const response = await fetch(`https://api.github.com/repos/laurent22/joplin/releases?page=${page}&per_page=${perPage}`, {
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'Joplin Forum Updater',
		},
	});

	if (!response.ok) throw new Error(`Cannot fetch releases: ${response.statusText}`);

	const releases: GitHubRelease[] = await response.json();
	if (!releases.length) throw new Error('Cannot find latest release');

	return releases;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function githubRelease(project: string, tagName: string, options: any = null): Promise<GitHubRelease> {
	options = { isDraft: false,
		isPreRelease: false, ...options };

	const oauthToken = await githubOauthToken();

	const response = await fetch(`https://api.github.com/repos/laurent22/${project}/releases`, {
		method: 'POST',
		body: JSON.stringify({
			tag_name: tagName,
			name: tagName,
			draft: options.isDraft,
			prerelease: options.isPreRelease,
		}),
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `token ${oauthToken}`,
		},
	});

	const responseText = await response.text();

	if (!response.ok) throw new Error(`Cannot create GitHub release: ${responseText}`);

	const responseJson = JSON.parse(responseText);
	if (!responseJson.url) throw new Error(`No URL for release: ${responseText}`);

	return responseJson;
}

export const gitHubLinkify = (markdown: string) => {
	markdown = markdown.replace(/#(\d+)/g, '[#$1](https://github.com/laurent22/joplin/issues/$1)');
	markdown = markdown.replace(/\(([a-f0-9]+)\)/g, '([$1](https://github.com/laurent22/joplin/commit/$1))');
	return markdown;
};

export function readline(question: string) {
	return new Promise((resolve) => {
		const readline = require('readline');

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.question(`${question} `, (answer: string) => {
			resolve(answer);
			rl.close();
		});
	});
}

export function isLinux() {
	return process && process.platform === 'linux';
}

export function isWindows() {
	return process && process.platform === 'win32';
}

export function isMac() {
	return process && process.platform === 'darwin';
}

export async function insertContentIntoFile(filePath: string, markerOpen: string, markerClose: string, contentToInsert: string) {
	let content = await readFile(filePath, 'utf-8');
	// [^]* matches any character including new lines
	const regex = new RegExp(`${markerOpen}[^]*?${markerClose}`);
	content = content.replace(regex, markerOpen + contentToInsert + markerClose);
	await writeFile(filePath, content);
}

export function dirname(path: string) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
}

export function basename(path: string) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
}

export function filename(path: string, includeDir = false) {
	if (!path) throw new Error('Path is empty');
	const output = includeDir ? path : basename(path);
	if (output.indexOf('.') < 0) return output;

	const splitted = output.split('.');
	splitted.pop();
	return splitted.join('.');
}

export function fileExtension(path: string) {
	if (!path) throw new Error('Path is empty');

	const output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
}
