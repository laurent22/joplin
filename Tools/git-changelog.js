"use strict"

// Supported commit formats:

// (Desktop|Mobile|Android|iOS[CLI): (New|Improved|Fixed): Some message..... (#ISSUE)

// Requires git2json: https://github.com/tarmstrong/git2json

require('app-module-path').addPath(__dirname + '/../ReactNativeClient');

const rootDir = __dirname + '/..';
const { basename, dirname, filename, fileExtension } = require(rootDir + '/ReactNativeClient/lib/path-utils.js');
const fs = require('fs-extra');
const { execCommand } = require('./tool-utils.js');
const { sprintf } = require('sprintf-js');

async function gitTags() {
	const r = await execCommand('git tag --format="%(objectname) %(refname:short)" --sort=-creatordate');

	const output = [];
	const lines = r.split('\n');
	for (const line of lines) {
		const s = line.split(' ');
		if (s.length !== 2) throw new Error('Unexpected log line format: ' + line);
		output.push({
			hash: s[0].trim(),
			name: s[1].trim(),
		});
	}

	return output;
}

async function gitLog() {
	await execCommand('git2json > gitlog.json');
	const output = await fs.readJson(rootDir + '/gitlog.json');
	if (!output || !output.length) throw new Error('Could not read git log or could not generate gitlog.json');
	await fs.remove('gitlog.json');
	return output;
}

async function gitLogSinceTag(logs, tagHash) {
	const output = [];
	let found = false;

	for (const log of logs) {
		if (log.commit === tagHash) {
			found = true;
			break;
		}
		output.push(log);
	}

	if (!found) throw new Error('Could not find tag hash: ' + tagHash);

	return output;
}

function platformFromTag(tagName) {
	if (tagName.indexOf('v') === 0) return 'desktop';
	if (tagName.indexOf('android') >= 0) return 'android';
	if (tagName.indexOf('ios') >= 0) return 'ios';
	if (tagName.indexOf('clipper') === 0) return 'clipper';
	if (tagName.indexOf('cli') === 0) return 'cli';
	throw new Error('Could not determine platform from tag: ' + tagName);
}

function filterLogs(logs, platform) {
	const output = [];
	const revertedLogs = [];

	for (const log of logs) {

		// Save to an array any commit that has been reverted, and exclude
		// these from the final output array.
		const revertMatches = log.message.split('\n')[0].trim().match(/^Revert "(.*?)"$/);
		if (revertMatches && revertMatches.length >= 2) {
			revertedLogs.push(revertMatches[1]);
			continue;
		}

		if (revertedLogs.indexOf(log.message) >= 0) continue;

		let prefix = log.message.trim().toLowerCase().split(':');
		if (prefix.length <= 1) continue;
		prefix = prefix[0].split(',').map(s => s.trim());

		let addIt = false;

		if (prefix.indexOf('all') >= 0 && platform !== 'clipper') addIt = true;
		if ((platform === 'android' || platform === 'ios') && prefix.indexOf('mobile') >= 0) addIt = true;
		if (platform === 'android' && prefix.indexOf('android') >= 0) addIt = true;
		if (platform === 'ios' && prefix.indexOf('ios') >= 0) addIt = true;
		if (platform === 'desktop' && prefix.indexOf('desktop') >= 0) addIt = true;
		if (platform === 'cli' && prefix.indexOf('cli') >= 0) addIt = true;
		if (platform === 'clipper' && prefix.indexOf('clipper') >= 0) addIt = true;

		if (addIt) output.push(log);
	}

	return output;
}

function formatCommitMessage(msg) {
	let output = '';
	
	const splitted = msg.split(':');

	if (splitted.length) {
		const platform = splitted[0].trim().toLowerCase();
		if (['android', 'mobile', 'ios', 'desktop', 'cli', 'clipper', 'all'].indexOf(platform) >= 0) {
			splitted.splice(0, 1);
		}

		output = splitted.join(':');
	}

	output = output.split('\n')[0].trim();

	const detectType = msg => {
		msg = msg.trim().toLowerCase();

		if (msg.indexOf('fix') === 0) return 'fixed';
		if (msg.indexOf('add') === 0) return 'new';
		if (msg.indexOf('change') === 0) return 'improved';
		if (msg.indexOf('update') === 0) return 'improved';
		if (msg.indexOf('improve') === 0) return 'improved';

		return 'improved';
	}

	const parseCommitMessage = (msg) => {
		const parts = msg.split(':');
		const defaultType = 'improved';

		if (parts.length === 1) {
			return {
				type: detectType(msg),
				message: msg.trim(),
			};
		}

		const t = parts[0].trim().toLowerCase();

		parts.splice(0, 1);
		const message = parts.join(':').trim();

		let type = null;

		if (t.indexOf('fix') === 0) type = 'fixed';
		if (t.indexOf('new') === 0) type = 'new';
		if (t.indexOf('improved') === 0) type = 'improved';

		if (!type) type = detectType(message);
	
		let issueNumber = output.match(/#(\d+)/);
		issueNumber = issueNumber && issueNumber.length >= 2 ? issueNumber[1] : null;

		return {
			type: type,
			message: message,
			issueNumber: issueNumber,
		};
	}

	const commitMessage = parseCommitMessage(output);

	output = capitalizeFirstLetter(commitMessage.type) + ': ' + capitalizeFirstLetter(commitMessage.message);
	if (commitMessage.issueNumber) {
		const formattedIssueNum = '(#' + commitMessage.issueNumber + ')'
		if (output.indexOf(formattedIssueNum) < 0) output += ' ' + formattedIssueNum;
	}

	return output;
}

function createChangeLog(logs) {
	const output = [];

	for (const log of logs) {
		output.push(formatCommitMessage(log.message));
	}

	return output;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv._.length) throw new Error('Tag name must be specified');

	const sinceTagName = argv._[0];
	const platform = platformFromTag(sinceTagName);

	const logs = await gitLog();
	const tags = await gitTags();

	let sinceTagHash = null;
	for (const tag of tags) {
		if (tag.name === sinceTagName) {
			sinceTagHash = tag.hash;
			break;
		}
	}

	if (!sinceTagHash) throw new Error('Could not find tag: ' + sinceTagName);

	const logsSinceTags = await gitLogSinceTag(logs, sinceTagHash);
	const filteredLogs = filterLogs(logsSinceTags, platform);

	let changelog = createChangeLog(filteredLogs);

	const changelogFixes = [];
	const changelogImproves = [];
	const changelogNews = [];

	for (const l of changelog) {
		if (l.indexOf('Fix') === 0) {
			changelogFixes.push(l);
		} else if (l.indexOf('Improve') === 0) {
			changelogImproves.push(l);
		} else if (l.indexOf('New') === 0) {
			changelogNews.push(l);
		} else {
			throw new Error('Invalid changelog line: ' + l);
		}
	}

	changelog = [].concat(changelogNews).concat(changelogImproves).concat(changelogFixes);

	const changelogString = changelog.map(l => '- ' + l);
	console.info(changelogString.join('\n'));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
