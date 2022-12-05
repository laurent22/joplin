import { execCommand, isMac } from '../tool-utils';
import { existsSync, readFile } from 'fs-extra';
const gettextParser = require('gettext-parser');

export type Translations = Record<string, string>;

export const removePoHeaderDate = async (filePath: string) => {
	let sedPrefix = 'sed -i';
	if (isMac()) sedPrefix += ' ""'; // Note: on macOS it has to be 'sed -i ""' (BSD quirk)
	await execCommand(`${sedPrefix} -e'/POT-Creation-Date:/d' "${filePath}"`);
	await execCommand(`${sedPrefix} -e'/PO-Revision-Date:/d' "${filePath}"`);
};

export const translationExecutablePath = (file: string) => {
	const potentialPaths = [
		'/usr/local/opt/gettext/bin/',
		'/opt/local/bin/',
		'/usr/local/bin/',
	];

	for (const path of potentialPaths) {
		const pathFile = path + file;
		if (existsSync(pathFile)) {
			return pathFile;
		}
	}

	throw new Error(`${file} could not be found. Please install via brew or MacPorts.\n`);
};

export const mergePotToPo = async (potFilePath: string, poFilePath: string) => {
	let msgmergePath = 'msgmerge';
	if (isMac()) msgmergePath = translationExecutablePath('msgmerge'); // Needs to have been installed with `brew install gettext`

	const command = `${msgmergePath} -U "${poFilePath}" "${potFilePath}"`;
	const result = await execCommand(command);
	if (result && result.trim()) console.info(result.trim());
	await removePoHeaderDate(poFilePath);
};

export const parsePoFile = async (filePath: string) => {
	const content = await readFile(filePath);
	return gettextParser.po.parse(content);
};

// Convert the gettext translations, as returned by `gettextParser.po.parse()`
// to a <string, string> map, with the English text on the left and the
// translation on the right. If a particular translation is missing, no entry
// will be returned. The caller should display the English text in this case.
export const parseTranslations = (gettextTranslations: any) => {
	const output: Translations = {};

	// Translations are grouped by "msgctxt"

	for (const msgctxt of Object.keys(gettextTranslations.translations)) {
		const translations = gettextTranslations.translations[msgctxt];

		for (const n in translations) {
			if (!translations.hasOwnProperty(n)) continue;
			if (n === '') continue;
			const t = translations[n];
			let translated = '';
			if (t.comments && t.comments.flag && t.comments.flag.indexOf('fuzzy') >= 0) {
				// Don't include fuzzy translations
			} else {
				translated = t['msgstr'][0];
			}

			if (translated) output[n] = translated;
		}
	}

	return output;
};
