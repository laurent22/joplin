'use strict';

// Dependencies:
//
// sudo apt install gettext
// sudo apt install translate-toolkit

require('app-module-path').addPath(`${__dirname}/../ReactNativeClient`);

const rootDir = `${__dirname}/..`;

const { filename, fileExtension } = require(`${rootDir}/ReactNativeClient/lib/path-utils.js`);
const fs = require('fs-extra');
const gettextParser = require('gettext-parser');

const cliDir = `${rootDir}/CliClient`;
const cliLocalesDir = `${cliDir}/locales`;
const rnDir = `${rootDir}/ReactNativeClient`;
const electronDir = `${rootDir}/ElectronClient`;

const { execCommand, isMac, insertContentIntoFile } = require('./tool-utils.js');
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
		let translated = '';
		if (t.comments && t.comments.flag && t.comments.flag.indexOf('fuzzy') >= 0) {
			// Don't include fuzzy translations
		} else {
			translated = t['msgstr'][0];
		}

		if (translated) output[n] = translated;
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

function executablePath(file) {
	const potentialPaths = [
		'/usr/local/opt/gettext/bin/',
		'/opt/local/bin/',
		'/usr/local/bin/',
	];

	for (const path of potentialPaths) {
		let pathFile = path + file;
		if (fs.existsSync(pathFile)) {
			return pathFile;
		}
	}
	throw new Error(`${file} could not be found. Please install via brew or MacPorts.\n`);
}

async function removePoHeaderDate(filePath) {
	let sedPrefix = 'sed -i';
	if (isMac()) sedPrefix += ' ""'; // Note: on macOS it has to be 'sed -i ""' (BSD quirk)
	await execCommand(`${sedPrefix} -e'/POT-Creation-Date:/d' "${filePath}"`);
	await execCommand(`${sedPrefix} -e'/PO-Revision-Date:/d' "${filePath}"`);
}

async function createPotFile(potFilePath, sources) {
	let baseArgs = [];
	baseArgs.push('--from-code=utf-8');
	baseArgs.push(`--output="${potFilePath}"`);
	baseArgs.push('--language=JavaScript');
	baseArgs.push('--copyright-holder="Laurent Cozic"');
	baseArgs.push('--package-name=Joplin-CLI');
	baseArgs.push('--package-version=1.0.0');
	// baseArgs.push('--no-location');
	baseArgs.push('--keyword=_n:1,2');

	for (let i = 0; i < sources.length; i++) {
		let args = baseArgs.slice();
		if (i > 0) args.push('--join-existing');
		args.push(sources[i]);
		let xgettextPath = 'xgettext';
		if (isMac()) xgettextPath = executablePath('xgettext'); // Needs to have been installed with `brew install gettext`
		const cmd = `${xgettextPath} ${args.join(' ')}`;
		const result = await execCommand(cmd);
		if (result) console.error(result);
		await removePoHeaderDate(potFilePath);
	}
}

async function mergePotToPo(potFilePath, poFilePath) {
	let msgmergePath = 'msgmerge';
	if (isMac()) msgmergePath = executablePath('msgmerge'); // Needs to have been installed with `brew install gettext`

	const command = `${msgmergePath} -U "${poFilePath}" "${potFilePath}"`;
	const result = await execCommand(command);
	if (result) console.error(result);
	await removePoHeaderDate(poFilePath);
}

function buildIndex(locales, stats) {
	let output = [];
	output.push('var locales = {};');
	output.push('var stats = {};');

	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		output.push(`locales['${locale}'] = require('./${locale}.json');`);
	}

	for (let i = 0; i < stats.length; i++) {
		const stat = Object.assign({}, stats[i]);
		const locale = stat.locale;
		delete stat.locale;
		delete stat.translatorName;
		delete stat.languageName;
		delete stat.untranslatedCount;
		output.push(`stats['${locale}'] = ${JSON.stringify(stat)};`);
	}

	output.push('module.exports = { locales: locales, stats: stats };');
	return output.join('\n');
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
	let pocountPath = 'pocount';
	if (isMac()) pocountPath = executablePath('pocount');

	const command = `${pocountPath} "${poFile}"`;
	const result = await execCommand(command);
	const matches = result.match(/Translated:\s*?(\d+)\s*\((.+?)%\)/);
	if (!matches || matches.length < 3) throw new Error(`Cannot extract status: ${command}:\n${result}`);
	const percentDone = Number(matches[2]);
	if (isNaN(percentDone)) throw new Error(`Cannot extract percent translated: ${command}:\n${result}`);

	const untranslatedMatches = result.match(/Untranslated:\s*?(\d+)/);
	if (!untranslatedMatches) throw new Error(`Cannot extract untranslated: ${command}:\n${result}`);
	const untranslatedCount = Number(untranslatedMatches[1]);

	let translatorName = '';
	const content = await fs.readFile(poFile, 'utf-8');

	translatorName = extractTranslator(/Last-Translator:\s*?(.*)/, content);
	if (!translatorName) {
		translatorName = extractTranslator(/Language-Team:\s*?(.*)/, content);
	}

	// Remove <> around email otherwise it's converted to HTML with (apparently) non-deterministic
	// encoding, so it changes on every update.
	translatorName = translatorName.replace(/ </, ' (');
	translatorName = translatorName.replace(/>/, ')');

	const isAlways100 = poFile.endsWith('en_US.po');

	return {
		percentDone: isDefault || isAlways100 ? 100 : percentDone,
		translatorName: translatorName,
		untranslatedCount: untranslatedCount,
	};
}

function flagImageUrl(locale) {
	const baseUrl = 'https://joplinapp.org/images/flags';
	if (locale === 'ar') return `${baseUrl}/country-4x3/arableague.png`;
	if (locale === 'eu') return `${baseUrl}/es/basque_country.png`;
	if (locale === 'gl_ES') return `${baseUrl}/es/galicia.png`;
	if (locale === 'ca') return `${baseUrl}/es/catalonia.png`;
	if (locale === 'ko') return `${baseUrl}/country-4x3/kr.png`;
	if (locale === 'sv') return `${baseUrl}/country-4x3/se.png`;
	if (locale === 'nb_NO') return `${baseUrl}/country-4x3/no.png`;
	if (locale === 'ro') return `${baseUrl}/country-4x3/ro.png`;
	if (locale === 'fa') return `${baseUrl}/country-4x3/ir.png`;
	if (locale === 'eo') return `${baseUrl}/esperanto.png`;
	return `${baseUrl}/country-4x3/${countryCodeOnly(locale).toLowerCase()}.png`;
}

function poFileUrl(locale) {
	return `https://github.com/laurent22/joplin/blob/master/CliClient/locales/${locale}.po`;
}

function translationStatusToMdTable(status) {
	let output = [];
	output.push(['&nbsp;', 'Language', 'Po File', 'Last translator', 'Percent done'].join('  |  '));
	output.push(['---', '---', '---', '---', '---'].join('|'));
	for (let i = 0; i < status.length; i++) {
		const stat = status[i];
		const flagUrl = flagImageUrl(stat.locale);
		output.push([`![](${flagUrl})`, stat.languageName, `[${stat.locale}](${poFileUrl(stat.locale)})`, stat.translatorName, `${stat.percentDone}%`].join('  |  '));
	}
	return output.join('\n');
}

async function updateReadmeWithStats(stats) {
	await insertContentIntoFile(
		`${rootDir}/README.md`,
		'<!-- LOCALE-TABLE-AUTO-GENERATED -->\n',
		'\n<!-- LOCALE-TABLE-AUTO-GENERATED -->',
		translationStatusToMdTable(stats)
	);
}

async function main() {
	const argv = require('yargs').argv;

	let potFilePath = `${cliLocalesDir}/joplin.pot`;
	let jsonLocalesDir = `${cliDir}/build/locales`;
	const defaultLocale = 'en_GB';

	const oldPotStatus = await translationStatus(false, potFilePath);

	await createPotFile(potFilePath, [
		`${cliDir}/app/*.js`,
		`${cliDir}/app/gui/*.js`,
		`${electronDir}/*.js`,
		`${electronDir}/gui/*.js`,
		`${electronDir}/gui/utils/*.js`,
		`${electronDir}/plugins/*.js`,
		`${rnDir}/lib/*.js`,
		`${rnDir}/lib/models/*.js`,
		`${rnDir}/lib/services/*.js`,
		`${rnDir}/lib/components/*.js`,
		`${rnDir}/lib/components/shared/*.js`,
		`${rnDir}/lib/components/screens/*.js`,
	]);

	const newPotStatus = await translationStatus(false, potFilePath);

	console.info(`Updated pot file. Total strings: ${oldPotStatus.untranslatedCount} => ${newPotStatus.untranslatedCount}`);

	const deletedCount = oldPotStatus.untranslatedCount - newPotStatus.untranslatedCount;
	if (deletedCount >= 10) {
		if (argv['skip-missing-strings-check']) {
			console.info(`${deletedCount} strings have been deleted, but proceeding anyway due to --skip-missing-strings-check flag`);
		} else {
			throw new Error(`${deletedCount} strings have been deleted - aborting as it could be a bug. To override, use the --skip-missing-strings-check flag.`);
		}
	}

	await execCommand(`cp "${potFilePath}" ` + `"${cliLocalesDir}/${defaultLocale}.po"`);

	fs.mkdirpSync(jsonLocalesDir, 0o755);

	let stats = [];

	let locales = availableLocales(defaultLocale);
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];

		console.info(`Building ${locale}...`);

		const poFilePäth = `${cliLocalesDir}/${locale}.po`;
		const jsonFilePath = `${jsonLocalesDir}/${locale}.json`;
		if (locale != defaultLocale) await mergePotToPo(potFilePath, poFilePäth);
		buildLocale(poFilePäth, jsonFilePath);

		const stat = await translationStatus(defaultLocale === locale, poFilePäth);
		stat.locale = locale;
		stat.languageName = countryDisplayName(locale);
		stats.push(stat);
	}

	stats.sort((a, b) => a.languageName < b.languageName ? -1 : +1);

	saveToFile(`${jsonLocalesDir}/index.js`, buildIndex(locales, stats));

	const destDirs = [
		`${rnDir}/locales`,
		`${electronDir}/locales`,
		`${cliDir}/locales-build`,
	];

	for (const destDir of destDirs) {
		await execCommand(`rsync -a "${jsonLocalesDir}/" "${destDir}/"`);
	}

	await updateReadmeWithStats(stats);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
