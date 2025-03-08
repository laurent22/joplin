// Supported commit formats:

// (Desktop|Mobile|Android|iOS[CLI): (New|Improved|Fixed): Some message..... (#ISSUE)

import { execCommand, githubUsername } from './tool-utils';
import { compareVersions } from 'compare-versions';

interface LogEntry {
	message: string;
	commit: string;
	author: Author;
	files: string[];
}

enum Platform {
	Unknown = 'unknown',
	Android = 'android',
	Windows = 'windows',
	MacOs = 'macos',
	Linux = 'linux',
	Ios = 'ios',
	Desktop = 'desktop',
	Clipper = 'clipper',
	Server = 'server',
	Cloud = 'cloud',
	Cli = 'cli',
	PluginGenerator = 'plugin-generator',
	PluginRepoCli = 'plugin-repo-cli',
}

enum PublishFormat {
	Full = 'full',
	Simple = 'simple',
}

interface Options {
	publishFormat: PublishFormat;
}

interface Author {
	email: string;
	name: string;
	login: string;
}

// From https://stackoverflow.com/a/6234804/561309
function escapeHtml(unsafe: string) {
	// We only escape <> as this is enough for Markdown
	return unsafe
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

async function gitLog(sinceTag: string) {
	const commandResult = await execCommand(`git log --pretty=format:"%H::::DIV::::%ae::::DIV::::%an::::DIV::::%s" ${sinceTag}..HEAD`);
	const lines = commandResult.split('\n');

	const output = [];
	for (const line of lines) {
		if (!line.trim()) continue;

		const splitted = line.split('::::DIV::::');
		const commit = splitted[0];
		const authorEmail = splitted[1];
		const authorName = splitted[2];
		const message = splitted[3].trim();
		let files: string[] = [];

		const filesResult = await execCommand(`git diff-tree --no-commit-id --name-only ${commit} -r`);
		files = filesResult.split('\n').map(s => s.trim()).filter(s => !!s);

		output.push({
			commit: commit,
			message: message,
			author: {
				email: authorEmail,
				name: authorName,
				login: await githubUsername(authorEmail, authorName),
			},
			files,
		});
	}

	return output;
}

async function gitTags() {
	const lines: string = await execCommand('git tag --sort=committerdate');
	const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
	return lines
		.split('\n')
		.map(l => l.trim())
		.filter(l => !!l)
		.sort((a, b) => collator.compare(a, b));
}

function platformFromTag(tagName: string): Platform {
	if (tagName.indexOf('v') === 0) return Platform.Desktop;
	if (tagName.indexOf('android') >= 0) return Platform.Android;
	if (tagName.indexOf('windows') >= 0) return Platform.Windows;
	if (tagName.indexOf('linux') >= 0) return Platform.Linux;
	if (tagName.indexOf('macos') >= 0) return Platform.MacOs;
	if (tagName.indexOf('ios') >= 0) return Platform.Ios;
	if (tagName.indexOf('clipper') === 0) return Platform.Clipper;
	if (tagName.indexOf('cli') === 0) return Platform.Cli;
	if (tagName.indexOf('server') === 0) return Platform.Server;
	if (tagName.indexOf('cloud') === 0) return Platform.Cloud;
	if (tagName.indexOf('plugin-generator') === 0) return Platform.PluginGenerator;
	if (tagName.indexOf('plugin-repo-cli') === 0) return Platform.PluginRepoCli;
	return Platform.Unknown;
	// throw new Error(`Could not determine platform from tag: "${tagName}"`);
}

export const filesApplyToPlatform = (files: string[], platform: string): boolean => {
	const isMainApp = ['android', 'ios', 'windows', 'linux', 'macos', 'desktop', 'cli', 'server'].includes(platform);
	const isMobile = ['android', 'ios'].includes(platform);

	for (const file of files) {
		if (file.startsWith('packages/app-cli') && platform === 'cli') return true;
		if (file.startsWith('packages/app-clipper') && platform === 'clipper') return true;
		if (file.startsWith('packages/app-mobile') && isMobile) return true;
		if (file.startsWith('packages/app-desktop') && platform === 'desktop') return true;
		if (file.startsWith('packages/fork-htmlparser2') && isMainApp) return true;
		if (file.startsWith('packages/fork-uslug') && isMainApp) return true;
		if (file.startsWith('packages/htmlpack') && isMainApp) return true;
		if (file.startsWith('packages/lib') && isMainApp) return true;
		if (file.startsWith('packages/pdf-viewer') && platform === 'desktop') return true;
		if (file.startsWith('packages/react-native-') && isMobile) return true;
		if (file.startsWith('packages/renderer') && isMainApp) return true;
		if (file.startsWith('packages/server') && platform === 'server') return true;
		if (file.startsWith('packages/tools') && isMainApp) return true;
		if (file.startsWith('packages/turndown') && isMainApp) return true;
	}

	return false;
};

export interface RenovateMessage {
	package: string;
	version: string;
}

export const parseRenovateMessage = (message: string): RenovateMessage => {
	const regexes = [
		/^Update dependency ([^\s]+) to ([^\s]+)/,
		/^Update ([^\s]+) monorepo to ([^\s]+)/,
		/^Update ([^\s]+)/,
	];

	for (const regex of regexes) {
		const m = message.match(regex);

		if (m) {
			return {
				package: m[1],
				version: m.length >= 3 ? m[2] : '',
			};
		}
	}

	throw new Error(`Not a Renovate message: ${message}`);
};

export const summarizeRenovateMessages = (messages: RenovateMessage[]): string => {
	// Exclude some dev dependencies
	messages = messages.filter(m => {
		if ([
			'@electron/notarize',
			'eslint',
			'gettext-extractor',
			'gettext-parser',
			'jest',
			'lint-staged',
			'madge',
			'ts-jest',
			'ts-loader',
			'ts-node',
			'typescript',
			'yeoman-generator',
			'nodemon',
		].includes(m.package)) {
			return false;
		}

		if (m.package.startsWith('@types/')) return false;
		if (m.package.startsWith('typescript-')) return false;
		if (m.package.startsWith('@testing-')) return false;

		return true;
	});

	const temp: Record<string, string> = {};
	for (const message of messages) {
		if (!(message.package in temp)) {
			temp[message.package] = message.version;
		} else {
			if (message.version > temp[message.package]) {
				temp[message.package] = message.version;
			}
		}
	}

	const temp2: string[] = [];
	for (const [pkg, version] of Object.entries(temp)) {
		const versionString = version ? ` (${version})` : '';
		temp2.push(`${pkg}${versionString}`);
	}

	temp2.sort();

	if (temp2.length) return `Updated packages ${temp2.join(', ')}`;

	return '';
};

const versionFromTag = (tag: string) => {
	const s = tag.split('-');
	return s[s.length - 1];
};

function filterLogs(logs: LogEntry[], platform: Platform) {
	const output: LogEntry[] = [];
	const revertedLogs = [];

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	// let updatedTranslations = false;

	const renovateMessages: RenovateMessage[] = [];

	for (const log of logs) {

		// Save to an array any commit that has been reverted, and exclude
		// these from the final output array.
		const revertMatches = log.message.split('\n')[0].trim().match(/^Revert "(.*?)"$/);
		if (revertMatches && revertMatches.length >= 2) {
			revertedLogs.push(revertMatches[1]);
			continue;
		}

		if (revertedLogs.indexOf(log.message) >= 0) continue;

		let isRenovate = false;
		let prefix = log.message.trim().toLowerCase().split(':');
		if (prefix.length <= 1) {
			if (log.author && log.author.name === 'renovate[bot]') {
				prefix = ['renovate'];
				isRenovate = true;
			} else {
				continue;
			}
		} else {
			prefix = prefix[0].split(',').map(s => s.trim());
		}

		let addIt = false;

		// "All" refers to desktop, CLI and mobile app. Clipper and Server are not included.
		if (prefix.indexOf('all') >= 0 && (platform !== 'clipper' && platform !== 'server' && platform !== 'cloud')) addIt = true;
		if ((platform === 'android' || platform === 'ios') && prefix.indexOf('mobile') >= 0) addIt = true;
		if (platform === 'android' && prefix.indexOf('android') >= 0) addIt = true;
		if (platform === 'ios' && prefix.indexOf('ios') >= 0) addIt = true;
		if (platform === 'desktop' && prefix.indexOf('desktop') >= 0) addIt = true;
		if (platform === 'desktop' && (prefix.indexOf('desktop') >= 0 || prefix.indexOf('api') >= 0 || prefix.indexOf('plugins') >= 0 || prefix.indexOf('macos') >= 0 || prefix.indexOf('windows') >= 0 || prefix.indexOf('linux') >= 0)) addIt = true;
		if (platform === 'cli' && prefix.indexOf('cli') >= 0) addIt = true;
		if (platform === 'clipper' && prefix.indexOf('clipper') >= 0) addIt = true;
		if (platform === 'server' && prefix.indexOf('server') >= 0) addIt = true;
		if (platform === 'cloud' && (prefix.indexOf('cloud') >= 0 || prefix.indexOf('server') >= 0)) addIt = true;

		if (isRenovate && filesApplyToPlatform(log.files, platform)) {
			renovateMessages.push(parseRenovateMessage(log.message));
			addIt = false;
		}

		// Translation updates often comes in format "Translation: Update pt_PT.po"
		// but that's not useful in a changelog especially since most people
		// don't know country and language codes. So we catch all these and
		// bundle them all up in a single "Updated translations" at the end.
		if (log.message.match(/Translation:\sUpdate\s.*?(\.po|[a-zA-Z][a-zA-Z]|[a-zA-Z][a-zA-Z]_[a-zA-Z][a-zA-Z])/)
			|| log.message.match(/Update.+\.po/)
		) {
			// updatedTranslations = true;
			addIt = false;
		}

		// Remove duplicate messages
		if (output.find(l => l.message === log.message)) {
			addIt = false;
		}

		if (addIt) output.push(log);
	}

	// Actually we don't really need this info - translations are being updated all the time
	// if (updatedTranslations) output.push({ message: 'Updated translations' });

	const renovateSummary = summarizeRenovateMessages(renovateMessages);
	if (renovateSummary) {
		output.push({
			author: { name: '', email: '', login: '' },
			commit: '',
			files: [],
			message: renovateSummary,
		});
	}

	return output;
}

function formatCommitMessage(commit: string, msg: string, author: Author, options: Options): string {
	options = { publishFormat: 'full', ...options };

	let output = '';

	const splitted = msg.split(':');

	let subModule = '';

	const isPlatformPrefix = (prefixString: string) => {
		const prefix = prefixString.split(',').map(p => p.trim().toLowerCase());
		for (const p of prefix) {
			if (['android', 'mobile', 'ios', 'desktop', 'windows', 'linux', 'macos', 'cli', 'clipper', 'all', 'api', 'plugins', 'server', 'cloud'].indexOf(p) >= 0) return true;
		}
		return false;
	};

	if (splitted.length) {
		const platform = splitted[0].trim().toLowerCase();
		if (platform === 'api') subModule = 'api';
		if (platform === 'plugins') subModule = 'plugins';
		if (isPlatformPrefix(platform)) {
			splitted.splice(0, 1);
		}

		output = splitted.join(':');
	}

	output = output.split('\n')[0].trim();

	const detectType = (msg: string) => {
		msg = msg.trim().toLowerCase();

		if (msg.indexOf('fix') === 0) return 'fixed';
		if (msg.indexOf('add') === 0) return 'new';
		if (msg.indexOf('change') === 0) return 'improved';
		if (msg.indexOf('update') === 0) return 'improved';
		if (msg.indexOf('improve') === 0) return 'improved';

		return 'improved';
	};

	const parseCommitMessage = (msg: string, subModule: string) => {
		const parts = msg.split(':');

		if (parts.length === 1) {
			return {
				type: detectType(msg),
				message: msg.trim(),
				subModule: subModule,
			};
		}

		let originalType = parts[0].trim();
		let t = originalType.toLowerCase();

		parts.splice(0, 1);
		let message = parts.join(':').trim();

		let type = null;

		// eg. "All: Resolves #712: New: Support for note history (#1415)"
		// "Resolves" doesn't tell us if it's new or improved so check the
		// third token (which in this case is "new").
		if (t.indexOf('resolves') === 0 && ['new', 'improved', 'fixed'].indexOf(parts[0].trim().toLowerCase()) >= 0) {
			t = parts[0].trim().toLowerCase();
			parts.splice(0, 1);
			message = parts.join(':').trim();
		} else if (t.indexOf('resolves') === 0) { // If we didn't have the third token default to "improved"
			t = 'improved';
			message = parts.join(':').trim();
		}

		if (t.indexOf('fix') === 0) type = 'fixed';
		if (t.indexOf('new') === 0) type = 'new';
		if (t.indexOf('improved') === 0) type = 'improved';
		if (t.indexOf('security') === 0) type = 'security';

		if (!type) {
			type = detectType(message);
			if (originalType.toLowerCase() === 'tinymce') originalType = 'WYSIWYG';
			message = `${originalType}: ${message}`;
		}

		const issueNumberMatch = output.match(/#(\d+)/);
		const issueNumber = issueNumberMatch && issueNumberMatch.length >= 2 ? issueNumberMatch[1] : null;

		return {
			type: type,
			message: message,
			issueNumber: issueNumber,
			subModule: subModule,
		};
	};

	const commitMessage = parseCommitMessage(output, subModule);

	const messagePieces = [];
	messagePieces.push(`${capitalizeFirstLetter(commitMessage.type)}`);
	if (commitMessage.subModule) messagePieces.push(`${capitalizeFirstLetter(commitMessage.subModule)}`);
	messagePieces.push(`${capitalizeFirstLetter(commitMessage.message)}`);

	output = messagePieces.join(': ');

	const issueRegex = /\((#[0-9]+)\)$/;

	if (options.publishFormat === 'full') {
		if (commitMessage.issueNumber) {
			const formattedIssueNum = `(#${commitMessage.issueNumber})`;
			if (output.indexOf(formattedIssueNum) < 0) output += ` ${formattedIssueNum}`;
		}

		let authorMd = null;
		const isLaurent = author.login === 'laurent22' || author.email === 'laurent22@users.noreply.github.com';
		if (author && (author.login || author.name) && !isLaurent) {
			if (author.login) {
				const escapedLogin = author.login.replace(/\]/g, '');
				authorMd = `[@${escapedLogin}](https://github.com/${encodeURI(author.login)})`;
			} else {
				authorMd = `${author.name}`;
			}
		}

		if (output.match(issueRegex)) {
			if (authorMd) {
				output = output.replace(issueRegex, `($1 by ${authorMd})`);
			}
		} else {
			const commitStrings = [commit.substr(0, 7)];
			if (authorMd) commitStrings.push(`by ${authorMd}`);
			if (commitStrings.join('').length) {
				output += ` (${commitStrings.join(' ')})`;
			}
		}
	}

	if (options.publishFormat !== 'full') {
		output = output.replace(issueRegex, '');
	}

	return escapeHtml(output);
}

function createChangeLog(logs: LogEntry[], options: Options) {
	const output = [];

	for (const log of logs) {
		output.push(formatCommitMessage(log.commit, log.message, log.author, options));
	}

	return output;
}

function capitalizeFirstLetter(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

// This function finds the first relevant tag starting from the given tag.
// The first "relevant tag" is the one that exists, and from which there are changes.
async function findFirstRelevantTag(baseTag: string, platform: Platform, allTags: string[]) {
	let baseTagIndex = allTags.indexOf(baseTag);
	if (baseTagIndex < 0) baseTagIndex = allTags.length;
	const baseVersion = versionFromTag(baseTag);

	for (let i = baseTagIndex - 1; i >= 0; i--) {
		const tag = allTags[i];
		if (platformFromTag(tag) !== platform) continue;
		const currentVersion = versionFromTag(tag);
		if (compareVersions(baseVersion, currentVersion) <= 0) continue;

		try {
			const logs = await gitLog(tag);
			const filteredLogs = filterLogs(logs, platform);
			if (filteredLogs.length) return tag;
		} catch (error) {
			if (error.message.indexOf('unknown revision') >= 0) {
				// We skip the error - it means this particular tag has never been created
			} else {
				throw error;
			}
		}
	}

	throw new Error(`Could not find previous tag for: ${baseTag}`);
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv._.length) throw new Error('Tag name must be specified. Provide the tag of the new version and git-changelog will walk backward to find the changes to the previous relevant tag.');

	const allTags = await gitTags();
	const fromTagName = argv._[0];
	let toTagName = argv._.length >= 2 ? argv._[1] : '';

	const platform = platformFromTag(fromTagName);

	if (!toTagName) toTagName = await findFirstRelevantTag(fromTagName, platform, allTags);

	const logsSinceTags = await gitLog(toTagName);

	const filteredLogs = filterLogs(logsSinceTags, platform);

	let publishFormat: PublishFormat = PublishFormat.Full;
	if (['android', 'ios'].indexOf(platform) >= 0) publishFormat = PublishFormat.Simple;
	if (argv.publishFormat) publishFormat = argv.publishFormat;
	let changelog = createChangeLog(filteredLogs, { publishFormat: publishFormat });

	const changelogFixes = [];
	const changelogImproves = [];
	const changelogNews = [];

	for (const l of changelog) {
		if (l.indexOf('Fix') === 0 || l.indexOf('Security') === 0) {
			changelogFixes.push(l);
		} else if (l.indexOf('Improve') === 0) {
			changelogImproves.push(l);
		} else if (l.indexOf('New') === 0) {
			changelogNews.push(l);
		} else {
			throw new Error(`Invalid changelog line: ${l}`);
		}
	}

	changelogFixes.sort();
	changelogImproves.sort();
	changelogNews.sort();

	changelog = [].concat(changelogNews).concat(changelogImproves).concat(changelogFixes);

	const changelogString = changelog.map(l => `- ${l}`);
	console.info(changelogString.join('\n'));
}

if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
