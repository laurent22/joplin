"use strict"

require('app-module-path').addPath(__dirname + '/../ReactNativeClient');

const rootDir = __dirname + '/..';

const processArgs = process.argv.splice(2, process.argv.length);

const silentLog = processArgs.indexOf('--silent') >= 0;

const { basename, dirname, filename, fileExtension } = require(rootDir + '/ReactNativeClient/lib/path-utils.js');
const fs = require('fs-extra');
const gettextParser = require('gettext-parser');

const cliDir = rootDir + '/CliClient';
const cliLocalesDir = cliDir + '/locales';
const rnDir = rootDir + '/ReactNativeClient';
const electronDir = rootDir + '/ElectronClient/app';

const { execCommand } = require('./tool-utils.js');
const { countryDisplayName, countryCodeOnly } = require('lib/locale.js');

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

function extractTranslator(regex, poContent) {
	const translatorMatch = poContent.match(regex);
	let translatorName = '';
	
	if (translatorMatch && translatorMatch.length >= 1) {
		translatorName = translatorMatch[1];
		translatorName = translatorName.replace(/["\s]+$/, '');
		translatorName = translatorName.replace(/\\n$/, '');
		translatorName = translatorName.replace(/^\s*/, '');
	}

	if (translatorName.indexOf('FULL NAME') >= 0) return '';
	if (translatorName.indexOf('LL@li.org') >= 0) return '';

	return translatorName;
}

async function translationStatus(isDefault, poFile) {
	// "apt install translate-toolkit" to have pocount
	const command = 'pocount "' + poFile + '"';
	const result = await execCommand(command);
	const matches = result.match(/translated:\s*?(\d+)\s*\((.+?)%\)/);
	if (matches.length < 3) throw new Error('Cannot extract status: ' + command + ':\n' + result);
	
	const percentDone = Number(matches[2]);
	if (isNaN(percentDone)) throw new Error('Cannot extract percent translated: ' + command + ':\n' + result);

	let translatorName = '';
	const content = await fs.readFile(poFile, 'utf-8');

	translatorName = extractTranslator(/Last-Translator:\s*?(.*)/, content);
	if (!translatorName) {
		translatorName = extractTranslator(/Language-Team:\s*?(.*)/, content);
	}

	// "Last-Translator: Hrvoje Mandić <trbuhom@net.hr>\n"
	// let translatorMatch = content.match(/Last-Translator:\s*?(.*)/);
	// if (translatorMatch.length < 1) {
	// 	translatorMatch = content.match(/Last-Team:\s*?(.*)/);
	// }
	
	// if (translatorMatch.length >= 1) {
	// 	translatorName = translatorMatch[1];
	// 	translatorName = translatorName.replace(/["\s]+$/, '');
	// 	translatorName = translatorName.replace(/\\n$/, '');
	// 	translatorName = translatorName.replace(/^\s*/, '');
	// }

	// if (translatorName.indexOf('FULL NAME') >= 0) translatorName = '';

	return {
		percentDone: isDefault ? 100 : percentDone,
		translatorName: translatorName,
	};
}

function flagImageUrl(locale) {
	if (locale === 'eu') {
		return 'https://joplin.cozic.net/images/flags/es/basque_country.png';
	} else {
		return 'https://joplin.cozic.net/images/flags/country-4x3/' + countryCodeOnly(locale).toLowerCase() + '.png'
	}
}

function poFileUrl(locale) {
	return 'https://github.com/laurent22/joplin/blob/master/CliClient/locales/' + locale + '.po';
}

function translationStatusToMdTable(status) {
	let output = [];
	output.push(['&nbsp;', 'Language', 'Po File', 'Last translator', 'Percent done'].join('  |  '));
	output.push(['---', '---', '---', '---', '---'].join('|'));
	for (let i = 0; i < status.length; i++) {
		const stat = status[i];
		const flagUrl = flagImageUrl(stat.locale);
		output.push(['![](' + flagUrl + ')', stat.languageName, '[' + stat.locale + '](' + poFileUrl(stat.locale) + ')', stat.translatorName, stat.percentDone + '%'].join('  |  '));
	}
	return output.join('\n');
}

async function updateReadmeWithStats(stats) {
	const mdTableMarkerOpen = '<!-- LOCALE-TABLE-AUTO-GENERATED -->\n';
	const mdTableMarkerClose = '\n<!-- LOCALE-TABLE-AUTO-GENERATED -->';
	let mdTable = translationStatusToMdTable(stats);
	mdTable = mdTableMarkerOpen + mdTable + mdTableMarkerClose;

	let content = await fs.readFile(rootDir + '/README.md', 'utf-8');
	// [^]* matches any character including new lines
	const regex = new RegExp(mdTableMarkerOpen + '[^]*?' + mdTableMarkerClose);
	content = content.replace(regex, mdTable);
	await fs.writeFile(rootDir + '/README.md', content);
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

	let stats = [];

	let locales = availableLocales(defaultLocale);
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		const poFilePäth = cliLocalesDir + '/' + locale + '.po';
		const jsonFilePath = jsonLocalesDir + '/' + locale + '.json';
		if (locale != defaultLocale) await mergePotToPo(potFilePath, poFilePäth);
		buildLocale(poFilePäth, jsonFilePath);

		const stat = await translationStatus(defaultLocale === locale, poFilePäth);
		stat.locale = locale;
		stat.languageName = countryDisplayName(locale);
		stats.push(stat);
	}

	stats.sort((a, b) => a.languageName < b.languageName ? -1 : +1);

	saveToFile(jsonLocalesDir + '/index.js', buildIndex(locales));

	const rnJsonLocaleDir = rnDir + '/locales';
	await execCommand('rsync -a "' + jsonLocalesDir + '/" "' + rnJsonLocaleDir + '"');

	const electronJsonLocaleDir = electronDir + '/locales';
	await execCommand('rsync -a "' + jsonLocalesDir + '/" "' + electronJsonLocaleDir + '"');

	await updateReadmeWithStats(stats);
}

main().catch((error) => {
	console.error(error);
});