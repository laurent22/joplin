// Dependencies:
//
// sudo apt install gettext sudo apt install translate-toolkit
//
// gettext v21+ is required as versions before that have bugs when parsing
// JavaScript template strings which means we would lose translations.

import markdownUtils from '@joplin/lib/markdownUtils';
import { translationExecutablePath, removePoHeaderDate, mergePotToPo, parsePoFile, parseTranslations, TranslationStatus } from './utils/translation';
import { execCommand, isMac, insertContentIntoFile, filename, dirname, fileExtension } from './tool-utils.js';
import { countryDisplayName, countryCodeOnly } from '@joplin/lib/locale';
import { readdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { copy, mkdirpSync, remove } from 'fs-extra';
import { GettextExtractor, JsExtractors } from 'gettext-extractor';

const rootDir = `${__dirname}/../..`;
const localesDir = `${__dirname}/locales`;
const libDir = `${rootDir}/packages/lib`;

function serializeTranslation(translation: string) {
	const output = parseTranslations(translation);
	return JSON.stringify(output, Object.keys(output).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : +1), '\t');
}

function saveToFile(filePath: string, data: string) {
	writeFileSync(filePath, data);
}

async function buildLocale(inputFile: string, outputFile: string) {
	const r = await parsePoFile(inputFile);
	const translation = serializeTranslation(r);
	saveToFile(outputFile, translation);
	return { headers: r.headers };
}

async function createPotFile(potFilePath: string) {
	const excludedDirs = [
		'./.git/*',
		'./.github/*',
		'./**/node_modules/*',
		'./Assets/*',
		'./Assets/TinyMCE/*',
		'./docs/*',
		'./node_modules/*',
		'./packages/app-cli/build/*',
		'./packages/app-cli/locales-build/*',
		'./packages/app-cli/locales/*',
		'./packages/app-cli/tests-build/*',
		'./packages/app-cli/tests/*',
		'./packages/app-clipper/*',
		'./packages/app-desktop/build/*',
		'./packages/app-desktop/dist/*',
		'./packages/app-desktop/gui/note-viewer/pluginAssets/*',
		'./packages/app-desktop/gui/style/*',
		'./packages/app-desktop/integration-tests/*',
		'./packages/app-desktop/lib/*',
		'./packages/app-desktop/pluginAssets/*',
		'./packages/app-desktop/tools/*',
		'./packages/app-desktop/vendor/*',
		'./packages/app-mobile/android/*',
		'./packages/app-mobile/ios/*',
		'./packages/app-mobile/pluginAssets/*',
		'./packages/app-mobile/tools/*',
		'./packages/default-plugins/plugin-sources/*',
		'./packages/doc-builder/build/*',
		'./packages/fork-*/*',
		'./packages/lib/rnInjectedJs/*',
		'./packages/lib/vendor/*',
		'./packages/renderer/assets/*',
		'./packages/server/dist/*',
		'./packages/tools/*',
		'./packages/turndown-plugin-gfm/*',
		'./packages/turndown/*',
		'./patches/*',
		'./readme/*',
	];

	const findCommand = `find . -type f \\( -iname \\*.js -o -iname \\*.ts -o -iname \\*.tsx \\) -not -path '${excludedDirs.join('\' -not -path \'')}'`;
	process.chdir(rootDir);
	let files = (await execCommand(findCommand)).split('\n');

	// Further filter files - in particular remove some specific files and
	// extensions we don't need. Also, when there's two file with the same
	// basename, such as "example.js", and "example.ts", we only keep the file
	// with ".ts" extension (since the .js should be the compiled file).

	const toProcess: Record<string, string> = {};

	for (const file of files) {
		if (!file) continue;

		const nameNoExt = `${dirname(file)}/${filename(file)}`;

		if (nameNoExt.endsWith('CodeMirror.bundle.min')) continue;
		if (nameNoExt.endsWith('CodeMirror.bundle')) continue;
		if (nameNoExt.endsWith('.test')) continue;
		if (nameNoExt.endsWith('.eslintrc')) continue;
		if (nameNoExt.endsWith('jest.config')) continue;
		if (nameNoExt.endsWith('jest.setup')) continue;
		if (nameNoExt.endsWith('webpack.config')) continue;
		if (nameNoExt.endsWith('.prettierrc')) continue;
		if (file.endsWith('.d.ts')) continue;

		if (toProcess[nameNoExt] && ['ts', 'tsx'].includes(fileExtension(toProcess[nameNoExt]))) {
			continue;
		}

		toProcess[nameNoExt] = file;
	}

	files = [];
	for (const key of Object.keys(toProcess)) {
		files.push(toProcess[key]);
	}

	files.sort();

	// console.info(files.join('\n'));
	// process.exit(0);

	// Note: we previously used the xgettext utility, but it only partially
	// supports TypeScript and doesn't support .tsx files at all. Besides; the
	// TypeScript compiler now converts some `_('some string')` calls to
	// `(0,locale1._)('some string')`, which cannot be detected by xgettext.
	//
	// So now we use this gettext-extractor utility, which seems to do the job.
	// It supports .ts and .tsx files and appears to find the same strings as
	// xgettext.

	const extractor = new GettextExtractor();

	// In the following string:
	//
	//     _('Hello %s', 'Scott')
	//
	// "Hello %s" is the `text` (or "msgstr" in gettext parlance) , and "Scott"
	// is the `context` ("msgctxt").
	//
	// gettext-extractor allows adding both the text and context to the pot
	// file, however we should avoid this because a change in the context string
	// would mark the associated string as fuzzy. We want to avoid this because
	// the point of splitting into text and context is that even if the context
	// changes we don't need to retranslate the text. We use this for URLs for
	// instance.
	//
	// Because of this, below we don't set the "context" property.

	const parser = extractor
		.createJsParser([
			JsExtractors.callExpression('_', {
				arguments: {
					text: 0,
					// context: 1,
				},
			}),
			JsExtractors.callExpression('_n', {
				arguments: {
					text: 0,
					textPlural: 1,
					// context: 2,
				},
			}),
		]);

	for (const file of files) {
		parser.parseFile(file);
	}

	extractor.savePotFile(potFilePath, {
		'Project-Id-Version': 'Joplin',
		'Content-Type': 'text/plain; charset=UTF-8',
	});

	await removePoHeaderDate(potFilePath);
}

function buildIndex(locales: string[], stats: TranslationStatus[]) {
	const output = [];
	output.push('var locales = {};');
	output.push('var stats = {};');

	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		output.push(`locales['${locale}'] = require('./${locale}.json');`);
	}

	for (let i = 0; i < stats.length; i++) {
		const stat = { ...stats[i] };
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

function availableLocales(defaultLocale: string) {
	const output = [defaultLocale];
	// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
	readdirSync(localesDir).forEach((path) => {
		if (fileExtension(path) !== 'po') return;
		const locale = filename(path);
		if (locale === defaultLocale) return;
		output.push(locale);
	});
	return output;
}

function extractTranslator(regex: RegExp, poContent: string) {
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

function translatorNameToMarkdown(translatorName: string) {
	const matches = translatorName.match(/^(.*?)\s*\((.*)\)$/);
	if (!matches) return translatorName;
	return `[${markdownUtils.escapeTitleText(matches[1])}](mailto:${markdownUtils.escapeLinkUrl(matches[2])})`;
}

async function translationStatus(isDefault: boolean, poFile: string): Promise<TranslationStatus> {
	// "apt install translate-toolkit" to have pocount
	let pocountPath = 'pocount';
	if (isMac()) pocountPath = translationExecutablePath('pocount');

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
	const content = await readFile(poFile, 'utf-8');

	translatorName = extractTranslator(/Last-Translator:\s*?(.*)/, content);
	if (!translatorName) {
		translatorName = extractTranslator(/Language-Team:\s*?(.*)/, content);
	}

	// Remove <> around email otherwise it's converted to HTML with (apparently) non-deterministic
	// encoding, so it changes on every update.
	translatorName = translatorName.replace(/ </, ' (');
	translatorName = translatorName.replace(/>/, ')');

	// Some users have very long names and very long email addresses and in that case gettext
	// records it over several lines, and here we only have the first line. So if we're having a broken
	// email, add a closing ')' so that at least rendering works fine.
	if (translatorName.indexOf('(') >= 0 && translatorName.indexOf(')') < 0) translatorName += ')';

	translatorName = translatorNameToMarkdown(translatorName);

	const isAlways100 = poFile.endsWith('en_US.po');

	return {
		percentDone: isDefault || isAlways100 ? 100 : percentDone,
		translatorName: translatorName,
		untranslatedCount: untranslatedCount,
	};
}

function flagImageUrl(locale: string) {
	const baseUrl = 'https://joplinapp.org/images/flags';
	if (locale === 'ar') return `${baseUrl}/country-4x3/arableague.png`;
	if (locale === 'eu') return `${baseUrl}/es/basque_country.png`;
	if (locale === 'gl_ES') return `${baseUrl}/es/galicia.png`;
	if (locale === 'ca') return `${baseUrl}/es/catalonia.png`;
	if (locale === 'ko') return `${baseUrl}/country-4x3/kr.png`;
	if (locale === 'sv') return `${baseUrl}/country-4x3/se.png`;
	if (locale === 'nb_NO') return `${baseUrl}/country-4x3/no.png`;
	if (locale === 'ro') return `${baseUrl}/country-4x3/ro.png`;
	if (locale === 'vi') return `${baseUrl}/country-4x3/vn.png`;
	if (locale === 'fa') return `${baseUrl}/country-4x3/ir.png`;
	if (locale === 'eo') return `${baseUrl}/esperanto.png`;
	return `${baseUrl}/country-4x3/${countryCodeOnly(locale).toLowerCase()}.png`;
}

function poFileUrl(locale: string) {
	return `https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/${locale}.po`;
}

function translationStatusToMdTable(status: TranslationStatus[]) {
	const output = [];
	output.push(['&nbsp;', 'Language', 'Po File', 'Last translator', 'Percent done'].join('  |  '));
	output.push(['---', '---', '---', '---', '---'].join('|'));
	for (let i = 0; i < status.length; i++) {
		const stat = status[i];
		const flagUrl = flagImageUrl(stat.locale);
		output.push([`<img src="${flagUrl}" width="16px"/>`, stat.languageName, `[${stat.locale}](${poFileUrl(stat.locale)})`, stat.translatorName, `${stat.percentDone}%`].join('  |  '));
	}
	return output.join('\n');
}

async function updateReadmeWithStats(stats: TranslationStatus[]) {
	await insertContentIntoFile(
		`${rootDir}/readme/dev/localisation.md`,
		'<!-- LOCALE-TABLE-AUTO-GENERATED -->\n',
		'\n<!-- LOCALE-TABLE-AUTO-GENERATED -->',
		translationStatusToMdTable(stats),
	);
}

async function translationStrings(poFilePath: string) {
	const r = await parsePoFile(poFilePath);
	return Object.keys(r.translations['']);
}

function deletedStrings(oldStrings: string[], newStrings: string[]) {
	const output = [];
	for (const s1 of oldStrings) {
		if (newStrings.includes(s1)) continue;
		output.push(s1);
	}
	return output;
}

async function main() {
	const argv = require('yargs').argv;

	const missingStringsCheckOnly = !!argv['missing-strings-check-only'];

	let potFilePath = `${localesDir}/joplin.pot`;

	let tempPotFilePath = '';

	if (missingStringsCheckOnly) {
		tempPotFilePath = `${localesDir}/joplin-temp-${Math.floor(Math.random() * 10000000)}.pot`;
		await copy(potFilePath, tempPotFilePath);
		potFilePath = tempPotFilePath;
	}

	const jsonLocalesDir = `${libDir}/locales`;
	const defaultLocale = 'en_GB';

	const oldStrings = await translationStrings(potFilePath);
	const oldPotStatus = await translationStatus(false, potFilePath);

	await createPotFile(potFilePath);

	const newStrings = await translationStrings(potFilePath);
	const newPotStatus = await translationStatus(false, potFilePath);

	console.info(`Updated pot file. Total strings: ${oldPotStatus.untranslatedCount} => ${newPotStatus.untranslatedCount}`);

	if (tempPotFilePath) await remove(tempPotFilePath);

	const deletedCount = oldPotStatus.untranslatedCount - newPotStatus.untranslatedCount;
	if (deletedCount >= 5) {
		if (argv['skip-missing-strings-check']) {
			console.info(`${deletedCount} strings have been deleted, but proceeding anyway due to --skip-missing-strings-check flag`);
		} else {
			const msg = [`${deletedCount} strings have been deleted - aborting as it could be a bug. To override, use the --skip-missing-strings-check flag.`];
			msg.push('');
			msg.push('Deleted strings:');
			msg.push('');
			msg.push(deletedStrings(oldStrings, newStrings).map(s => `"${s}"`).join('\n'));
			throw new Error(msg.join('\n'));
		}
	}

	if (missingStringsCheckOnly) return;

	await execCommand(`cp "${potFilePath}" ` + `"${localesDir}/${defaultLocale}.po"`);

	mkdirpSync(jsonLocalesDir, 0o755);

	const stats = [];

	const locales = availableLocales(defaultLocale);
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];

		console.info(`Building ${locale}...`);

		const poFilePäth = `${localesDir}/${locale}.po`;
		const jsonFilePath = `${jsonLocalesDir}/${locale}.json`;
		if (locale !== defaultLocale) await mergePotToPo(potFilePath, poFilePäth);
		const { headers } = await buildLocale(poFilePäth, jsonFilePath);

		const stat = await translationStatus(defaultLocale === locale, poFilePäth);
		stat.pluralForms = headers['Plural-Forms'];
		stat.locale = locale;
		stat.languageName = countryDisplayName(locale);
		stats.push(stat);
	}

	stats.sort((a, b) => a.languageName < b.languageName ? -1 : +1);

	saveToFile(`${jsonLocalesDir}/index.js`, buildIndex(locales, stats));

	await updateReadmeWithStats(stats);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
