export { runPlugin, stopPlugin } from './startStopPlugin';

// Old plugins allowed to import legacy APIs
const legacyPluginIds = [
	'outline',
	'ylc395.noteLinkSystem',
	'com.github.joplin.kanban',
];

const pathLibrary = require('path');
const punycode = require('punycode/');

export const requireModule = (moduleName: string, fromPluginId: string) => {
	if (moduleName === 'path') {
		return pathLibrary;
	}

	if (legacyPluginIds.includes(fromPluginId)) {
		if (moduleName === 'punycode') {
			console.warn('Requiring punycode is deprecated. Please transition to a newer API.');
			return punycode;
		}
		if (moduleName === 'fs' || moduleName === 'fs-extra') {
			console.warn('The fs library is unavailable to mobile plugins. A non-functional mock will be returned.');
			return {
				existsSync: () => false,
				pathExists: () => false,
				readFileSync: () => '',
				readFile: () => '',
				writeFileSync: () => '',
				writeFile: () => '',
				appendFile: () => '',
			};
		}
		if (moduleName === 'process') {
			return {};
		}
		if (moduleName === 'url') {
			return { parse: (u: string) => new URL(u) };
		}
	}

	throw new Error(`Unable to require module ${moduleName} on mobile.`);
};

export { default as initializePluginBackgroundIframe } from './initializePluginBackgroundIframe';
export { default as initializeDialogWebView } from './initializeDialogWebView';
