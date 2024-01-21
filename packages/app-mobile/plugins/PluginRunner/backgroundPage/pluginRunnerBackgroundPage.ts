import './style.css';

export { runPlugin, stopPlugin } from './startStopPlugin';

const pathLibrary = require('path');
export const requireModule = (moduleName: string) => {
	if (moduleName === 'path') {
		return pathLibrary;
	}

	throw new Error(`Unable to require module ${moduleName} on mobile.`);
};

export { default as initializePluginBackgroundIframe } from './initializePluginBackgroundIframe';
export { default as initializeDialogWebView } from './initializeDialogWebView';
