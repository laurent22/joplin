const fs = require('fs-extra');

const loadCustomCss = async filePath => {
	let cssString = '';
	if (await fs.pathExists(filePath)) {
		try {
			cssString = await fs.readFile(filePath, 'utf-8');
		} catch (error) {
			let msg = error.message ? error.message : '';
			msg = `Could not load custom css from ${filePath}\n${msg}`;
			error.message = msg;
			throw error;
		}
	}

	return cssString;
};

const injectCustomStyles = async cssFilePath => {
	const css = await loadCustomCss(cssFilePath);
	const styleTag = document.createElement('style');
	styleTag.type = 'text/css';
	styleTag.appendChild(document.createTextNode(css));
	document.head.appendChild(styleTag);
};

module.exports = { loadCustomCss, injectCustomStyles };
