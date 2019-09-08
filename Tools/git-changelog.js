'use strict';

// Supported commit formats:

// (Desktop|Mobile|Android|iOS[CLI): (New|Improved|Fixed): Some message..... (#ISSUE)

require('app-module-path').addPath(__dirname + '/../ReactNativeClient');

const { execCommand } = require('./tool-utils.js');

async function gitLog(sinceTag) {
	let lines = await execCommand('git log --pretty=format:"%H:%s" ' + sinceTag + '..HEAD');
	lines = lines.split('\n');

	const output = [];
	for (const line of lines) {
		const splitted = line.split(':');
		const commit = splitted[0];
		const message = line.substr(commit.length + 1).trim();

		output.push({
			commit: commit,
			message: message,
		});
	}

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

	const isPlatformPrefix = prefix => {
		prefix = prefix.split(',').map(p => p.trim().toLowerCase());
		for (const p of prefix) {
			if (['android', 'mobile', 'ios', 'desktop', 'cli', 'clipper', 'all'].indexOf(p) >= 0) return true;
		}
		return false;
	};

	if (splitted.length) {
		const platform = splitted[0].trim().toLowerCase();
		if (isPlatformPrefix(platform)) {
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
	};

	const parseCommitMessage = (msg) => {
		const parts = msg.split(':');

		if (parts.length === 1) {
			return {
				type: detectType(msg),
				message: msg.trim(),
			};
		}

		let t = parts[0].trim().toLowerCase();

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
		}

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
	};

	const commitMessage = parseCommitMessage(output);

	output = capitalizeFirstLetter(commitMessage.type) + ': ' + capitalizeFirstLetter(commitMessage.message);
	if (commitMessage.issueNumber) {
		const formattedIssueNum = '(#' + commitMessage.issueNumber + ')';
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

	const logsSinceTags = await gitLog(sinceTagName);
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
