require('source-map-support').install();
require('babel-plugin-transform-runtime');

import fs from 'fs-extra';
import { fileExtension, basename, dirname } from 'lib/path-utils.js';
import wrap_ from 'word-wrap';
import { _, setLocale, languageCode } from 'lib/locale.js';

const rootDir = dirname(dirname(__dirname));
const MAX_WIDTH = 78;
const INDENT = '    ';

function wrap(text, indent) {
	return wrap_(text, {
		width: MAX_WIDTH - indent.length,
		indent: indent,
	});
}

function renderOptions(options, baseIndent) {
	let output = [];
	const optionColWidth = getOptionColWidth(options);

	for (let i = 0; i < options.length; i++) {
		let option = options[i];
		const flag = option[0];
		const indent = baseIndent + INDENT + ' '.repeat(optionColWidth + 2);
		
		let r = wrap(option[1], indent);
		r = r.substr(flag.length + (baseIndent + INDENT).length);
		r = baseIndent + INDENT + flag + r;
		output.push(r);
	}

	return output.join("\n");
}

function renderCommandHelp(cmd) {
	const baseIndent = '';

	let output = [];
	output.push(baseIndent + cmd.usage());
	output.push('');
	output.push(wrap(cmd.description(), baseIndent + INDENT));

	const optionString = renderOptions(cmd.options(), baseIndent);

	if (optionString) {
		output.push('');
		output.push(optionString);
	}
	return output.join("\n");
}

function getOptionColWidth(options) {
	let output = 0;
	for (let j = 0; j < options.length; j++) {
		const option = options[j];
		if (option[0].length > output) output = option[0].length;
	}
	return output;
}

export { renderCommandHelp };