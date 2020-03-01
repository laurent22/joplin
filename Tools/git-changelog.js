'use strict';

// Supported commit formats:

// (Desktop|Mobile|Android|iOS[CLI): (New|Improved|Fixed): Some message..... (#ISSUE)

require('app-module-path').addPath(`${__dirname}/../ReactNativeClient`);

const { execCommand, githubUsername } = require('./tool-utils.js');

async function gitLog(sinceTag) {
	let lines = await execCommand(`git log --pretty=format:"%H::::DIV::::%ae::::DIV::::%an::::DIV::::%s" ${sinceTag}..HEAD`);
	lines = lines.split('\n');

	const output = [];
	for (const line of lines) {
		const splitted = line.split('::::DIV::::');
		const commit = splitted[0];
		const authorEmail = splitted[1];
		const authorName = splitted[2];
		const message = splitted[3].trim();

		output.push({
			commit: commit,
			message: message,
			author: {
				email: authorEmail,
				name: authorName,
				login: await githubUsername(authorEmail, authorName),
			},
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
	throw new Error(`Could not determine platform from tag: ${tagName}`);
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
		if (platform === 'desktop' && (prefix.indexOf('desktop') >= 0 || prefix.indexOf('api') >= 0)) addIt = true;
		if (platform === 'cli' && prefix.indexOf('cli') >= 0) addIt = true;
		if (platform === 'clipper' && prefix.indexOf('clipper') >= 0) addIt = true;

		if (addIt) output.push(log);
	}

	return output;
}

function formatCommitMessage(msg, author, options) {
	options = Object.assign({}, { publishFormat: 'full' }, options);

	let output = '';

	const splitted = msg.split(':');

	let subModule = '';

	const isPlatformPrefix = prefix => {
		prefix = prefix.split(',').map(p => p.trim().toLowerCase());
		for (const p of prefix) {
			if (['android', 'mobile', 'ios', 'desktop', 'cli', 'clipper', 'all', 'api'].indexOf(p) >= 0) return true;
		}
		return false;
	};

	if (splitted.length) {
		const platform = splitted[0].trim().toLowerCase();
		if (platform === 'api') subModule = 'api';
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

	const parseCommitMessage = (msg, subModule) => {
		const parts = msg.split(':');

		if (parts.length === 1) {
			return {
				type: detectType(msg),
				message: msg.trim(),
				subModule: subModule,
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
			subModule: subModule,
		};
	};

	const commitMessage = parseCommitMessage(output, subModule);

	const messagePieces = [];
	messagePieces.push(`${capitalizeFirstLetter(commitMessage.type)}`);
	if (commitMessage.subModule) messagePieces.push(`${capitalizeFirstLetter(commitMessage.subModule)}`);
	messagePieces.push(`${capitalizeFirstLetter(commitMessage.message)}`);

	output = messagePieces.join(': ');

	if (options.publishFormat === 'full') {
		if (commitMessage.issueNumber) {
			const formattedIssueNum = `(#${commitMessage.issueNumber})`;
			if (output.indexOf(formattedIssueNum) < 0) output += ` ${formattedIssueNum}`;
		}

		let authorMd = null;
		if (author && (author.login || author.name) && author.login !== 'laurent22') {
			if (author.login) {
				const escapedLogin = author.login.replace(/\]/g, '');
				authorMd = `[@${escapedLogin}](https://github.com/${encodeURI(author.login)})`;
			} else {
				authorMd = `${author.name}`;
			}
		}

		if (authorMd) {
			output = output.replace(/\((#[0-9]+)\)$/, `($1 by ${authorMd})`);
		}
	}

	if (options.publishFormat !== 'full') {
		output = output.replace(/\((#[0-9]+)\)$/, '');
	}

	return output;
}

function createChangeLog(logs, options) {
	const output = [];

	for (const log of logs) {
		output.push(formatCommitMessage(log.message, log.author, options));
	}

	return output;
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function decreaseTagVersion(tag) {
	const s = tag.split('.');
	let num = Number(s.pop());
	num--;
	if (num < 0) throw new Error(`Cannot decrease tag version: ${tag}`);
	s.push(`${num}`);
	return s.join('.');
}

// This function finds the first relevant tag starting from the given tag.
// The first "relevant tag" is the one that exists, and from which there are changes.
async function findFirstRelevantTag(baseTag) {
	let tag = decreaseTagVersion(baseTag);
	while (true) {
		try {
			const logs = await gitLog(tag);
			if (logs.length) return tag;
		} catch (error) {
			if (error.message.indexOf('unknown revision') >= 0) {
				// We skip the error - it means this particular tag has never been created
			} else {
				throw error;
			}
		}

		tag = decreaseTagVersion(tag);
	}
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv._.length) throw new Error('Tag name must be specified. Provide the tag of the new version and git-changelog will walk backward to find the changes to the previous relevant tag.');

	const fromTagName = argv._[0];
	let toTagName = argv._.length >= 2 ? argv._[1] : '';

	const platform = platformFromTag(fromTagName);

	if (!toTagName) toTagName = await findFirstRelevantTag(fromTagName);

	const logsSinceTags = await gitLog(toTagName);

	const filteredLogs = filterLogs(logsSinceTags, platform);

	let publishFormat = 'full';
	if (['android', 'ios'].indexOf(platform) >= 0) publishFormat = 'simple';
	let changelog = createChangeLog(filteredLogs, { publishFormat: publishFormat });

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
			throw new Error(`Invalid changelog line: ${l}`);
		}
	}

	changelog = [].concat(changelogNews).concat(changelogImproves).concat(changelogFixes);

	const changelogString = changelog.map(l => `- ${l}`);
	console.info(changelogString.join('\n'));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
