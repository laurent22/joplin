"use strict"

require('app-module-path').addPath(__dirname);

const processArgs = process.argv.splice(2, process.argv.length);

const silentLog = processArgs.indexOf('--silent') >= 0;

const { basename, dirname, filename, fileExtension } = require('lib/path-utils.js');
const fs = require('fs-extra');
const gettextParser = require('gettext-parser');

const rootDir = dirname(dirname(__dirname));
const cliDir = rootDir + '/CliClient';
const cliLocalesDir = cliDir + '/locales';
const rnDir = rootDir + '/ReactNativeClient';
const electronDir = rootDir + '/ElectronClient/app';

function execCommand(command) {
	if (!silentLog) console.info('Running: ' + command);

	const exec = require('child_process').exec

	return new Promise((resolve, reject) => {
		let childProcess = exec(command, (error, stdout, stderr) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve(stdout.trim());
			}
		});
	});
}

function parsePoFile(filePath) {
	const content = fs.readFileSync(filePath);
	return gettextParser.po.parse(content);
}

function serializeTranslation(translation) {
	let output = {};
	const translations = translation.translations[''];
	for (let n in translations) {
		if (!translations.hasOwnProperty(n)) continue;
		if (n == '') continue;
		const t = translations[n];
		if (t.comments && t.comments.flag && t.comments.flag.indexOf('fuzzy') >= 0) {
			output[n] = t['msgid'];
		} else {		
			output[n] = t['msgstr'][0];
		}
	}
	return JSON.stringify(output);
}

function saveToFile(filePath, data) {
	fs.writeFileSync(filePath, data);
}

function buildLocale(inputFile, outputFile) {
	const r = parsePoFile(inputFile);
	const translation = serializeTranslation(r);
	saveToFile(outputFile, translation);
}

async function removePoHeaderDate(filePath) {
	// Note: on macOS this will fail because it needs to be 'sed -i ""'
	// Solution would be to install gsed, detect it here, and use it in place of sed in macOS
	// https://stackoverflow.com/questions/30003570/how-to-use-gnu-sed-on-mac-os-x#34815955
	await execCommand('sed -i -e\'/POT-Creation-Date:/d\' "' + filePath + '"');
	await execCommand('sed -i -e\'/PO-Revision-Date:/d\' "' + filePath + '"');
}

async function createPotFile(potFilePath, sources) {
	let baseArgs = [];
	baseArgs.push('--from-code=utf-8');
	baseArgs.push('--output="' + potFilePath + '"');
	baseArgs.push('--language=JavaScript');
	baseArgs.push('--copyright-holder="Laurent Cozic"');
	baseArgs.push('--package-name=Joplin-CLI');
	baseArgs.push('--package-version=1.0.0');
	baseArgs.push('--no-location');

	for (let i = 0; i < sources.length; i++) {
		let args = baseArgs.slice();
		if (i > 0) args.push('--join-existing');
		args.push(sources[i]);
		const result = await execCommand('xgettext ' + args.join(' '));
		if (result) console.error(result);
		await removePoHeaderDate(potFilePath);
	}
}

async function mergePotToPo(potFilePath, poFilePath) {
	const command = 'msgmerge -U "' + poFilePath + '" "' + potFilePath + '"';
	const result = await execCommand(command);
	if (result) console.error(result);
	await removePoHeaderDate(poFilePath);
}

function buildIndex(locales) {
	let output = [];
	output.push('var locales = {};');
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		output.push("locales['" + locale + "'] = require('./" + locale + ".json');");
	}
	output.push('module.exports = { locales: locales };');
	return output.join("\n");
}

function availableLocales(defaultLocale) {
	const output = [defaultLocale];
	fs.readdirSync(cliLocalesDir).forEach((path) => {
		if (fileExtension(path) !== 'po') return;
		const locale = filename(path);
		if (locale === defaultLocale) return;
		output.push(locale);
	});
	return output;
}

async function main() {
	let potFilePath = cliLocalesDir + '/joplin.pot';
	let jsonLocalesDir = cliDir + '/build/locales';
	const defaultLocale = 'en_GB';

	await createPotFile(potFilePath, [
		cliDir + '/app/*.js',
		cliDir + '/app/gui/*.js',
		electronDir + '/*.js',
		electronDir + '/gui/*.js',
		rnDir + '/lib/*.js',
		rnDir + '/lib/models/*.js',
		rnDir + '/lib/services/*.js',
		rnDir + '/lib/components/*.js',
		rnDir + '/lib/components/screens/*.js',
	]);

	await execCommand('cp "' + potFilePath + '" ' + '"' + cliLocalesDir + '/' + defaultLocale + '.po"');

	fs.mkdirpSync(jsonLocalesDir, 0o755);

	let locales = availableLocales(defaultLocale);
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		const poFilePäth = cliLocalesDir + '/' + locale + '.po';
		const jsonFilePath = jsonLocalesDir + '/' + locale + '.json';
		if (locale != defaultLocale) await mergePotToPo(potFilePath, poFilePäth);
		buildLocale(poFilePäth, jsonFilePath);
	}

	saveToFile(jsonLocalesDir + '/index.js', buildIndex(locales));

	const rnJsonLocaleDir = rnDir + '/locales';
	await execCommand('rsync -a "' + jsonLocalesDir + '/" "' + rnJsonLocaleDir + '"');

	const electronJsonLocaleDir = electronDir + '/locales';
	await execCommand('rsync -a "' + jsonLocalesDir + '/" "' + electronJsonLocaleDir + '"');
}

main().catch((error) => {
	console.error(error);
});