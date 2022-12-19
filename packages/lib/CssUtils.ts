import * as fs from 'fs-extra';

export const loadCustomCss = async (filePath: string) => {
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

export const injectCustomStyles = async (elementId: string, cssFilePath: string) => {
	const css = await loadCustomCss(cssFilePath);
	const styleTag = document.createElement('style');
	styleTag.setAttribute('id', elementId);
	styleTag.setAttribute('type', 'text/css');
	styleTag.appendChild(document.createTextNode(css));
	document.head.appendChild(styleTag);
};
