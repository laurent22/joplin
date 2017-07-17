"use strict"

require('source-map-support').install();
require('babel-plugin-transform-runtime');

import fs from 'fs-extra';
import gettextParser from 'gettext-parser';

const localeDir = __dirname + '/../app/locale';
const outputDir = __dirname + '/locale';

fs.mkdirpSync(outputDir, 0o755);

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
		output[n] = translations[n]['msgstr'][0];
	}
	return JSON.stringify(output);
}

function saveToFile(filePath, data) {
	fs.writeFileSync(filePath, data);
}

const inputFile = localeDir + '/fr_FR.po';
const outputFile = outputDir + '/fr_FR.json';

function buildLocale(inputFile, outputFile) {
	const r = parsePoFile(inputFile);
	const translation = serializeTranslation(r);
	saveToFile(outputFile, translation);
}

buildLocale(localeDir + '/fr_FR.po', outputDir + '/fr_FR.json');
buildLocale(localeDir + '/en_GB.po', outputDir + '/en_GB.json');