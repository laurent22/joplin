import { PluginApi, PluginWebViewApi } from '../types';
import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';

export { runPlugin, stopPlugin } from './startStopPlugin';

const pathLibrary = require('path');
export const requireModule = (moduleName: string) => {
	if (moduleName === 'path') {
		return pathLibrary;
	}

	throw new Error(`Unable to require module ${moduleName} on mobile.`);
};

export const createPluginApiProxy = async (messageChannelId: string) => {
	const localApi = { };
	const messenger = new WindowMessenger<PluginWebViewApi, PluginApi>(messageChannelId, parent, localApi);
	await messenger.awaitRemoteReady();

	(window as any).joplin = messenger.remoteApi.api.joplin;
};

export { default as initializeDialogIframe } from './initializeDialogIframe';
export { default as openDialog } from './openDialog';
