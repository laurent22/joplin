"use strict"

// Requires git2json: https://github.com/tarmstrong/git2json

require('app-module-path').addPath(__dirname + '/../ReactNativeClient');

const rootDir = __dirname + '/..';
const { basename, dirname, filename, fileExtension } = require(rootDir + '/ReactNativeClient/lib/path-utils.js');
const fs = require('fs-extra');
const { execCommand } = require('./tool-utils.js');

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

	for (const log of logs) {
		const msg = log.message.trim().toLowerCase();

		let addIt = false;

		if (msg.indexOf('all:') === 0 && platform !== 'clipper') addIt = true;
		if ((platform === 'android' || platform === 'ios') && msg.indexOf('mobile:') === 0) addIt = true;
		if (platform === 'android' && msg.indexOf('android:') === 0) addIt = true;
		if (platform === 'ios' && msg.indexOf('ios:') === 0) addIt = true;
		if (platform === 'desktop' && msg.indexOf('desktop:') === 0) addIt = true;
		if (platform === 'cli' && msg.indexOf('cli:') === 0) addIt = true;
		if (platform === 'clipper' && msg.indexOf('clipper:') === 0) addIt = true;

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
	output = capitalizeFirstLetter(output);

	output = output.replace(/Fixes #(\d+)(.*)/, "Fix #$1$2");

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

	const changelog = createChangeLog(filteredLogs);
	changelog.sort((a, b) => {
		a = a.toLowerCase();
		b = b.toLowerCase();

		const aIsFix = a.indexOf('fix') === 0;
		const bIsFix = b.indexOf('fix') === 0;

		if (aIsFix && bIsFix) return 0;
		if (aIsFix) return +1;
		return -1;
	});	

	const changelogString = changelog.map(l => '- ' + l);
	console.info(changelogString.join('\n'));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
