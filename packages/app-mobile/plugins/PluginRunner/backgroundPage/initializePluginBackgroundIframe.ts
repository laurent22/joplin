import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';
import { PluginApi, PluginWebViewApi } from '../types';
import reportUnhandledErrors from './utils/reportUnhandledErrors';


export const initializePluginBackgroundIframe = async (messageChannelId: string) => {
	const localApi = { };
	const messenger = new WindowMessenger<PluginWebViewApi, PluginApi>(messageChannelId, parent, localApi);
	await messenger.awaitRemoteReady();

	(window as any).joplin = messenger.remoteApi.api.joplin;

	reportUnhandledErrors(messenger.remoteApi.onError);
};

export default initializePluginBackgroundIframe;
