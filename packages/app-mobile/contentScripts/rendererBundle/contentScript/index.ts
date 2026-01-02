import Renderer from './Renderer';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { RendererProcessApi, MainProcessApi, RendererWebViewOptions } from '../types';

interface WebViewLib {
	initialize(config: unknown): void;
}

interface WebViewApi {
	postMessage: (contentScriptId: string, args: unknown)=> void;
}

interface ExtendedWindow extends Window {
	webviewLib: WebViewLib;
	webviewApi: WebViewApi;
	joplinPostMessage_: (message: string, args: unknown)=> void;
}

declare const window: ExtendedWindow;
declare const webviewLib: WebViewLib;

const initializeMessenger = (options: RendererWebViewOptions) => {
	const messenger = new WebViewToRNMessenger<RendererProcessApi, MainProcessApi>(
		'renderer',
		null,
	);

	window.joplinPostMessage_ = (message: string, _args: unknown) => {
		return messenger.remoteApi.onPostMessage(message);
	};

	window.webviewApi = {
		postMessage: messenger.remoteApi.onPostPluginMessage,
	};

	webviewLib.initialize({
		postMessage: (message: string) => {
			messenger.remoteApi.onPostMessage(message);
		},
	});
	// Share the webview library globally so that the renderer can access it.
	window.webviewLib = webviewLib;

	const renderer = new Renderer({
		...options,
		fsDriver: messenger.remoteApi.fsDriver,
	});

	messenger.setLocalInterface({
		renderer,
		jumpToHash: (hash: string) => {
			location.hash = `#${hash}`;
		},
	});

	return { messenger };
};

// eslint-disable-next-line import/prefer-default-export -- This is a bundle entrypoint
export const initialize = (options: RendererWebViewOptions) => {
	const { messenger } = initializeMessenger(options);

	const lastScrollTop: number|null = null;
	const onMainContentScroll = () => {
		const newScrollTop = document.scrollingElement.scrollTop;
		if (lastScrollTop !== newScrollTop) {
			const scrollHeight = document.scrollingElement.scrollHeight;
			messenger.remoteApi.onScroll({
				fraction: newScrollTop / (scrollHeight || 1),
			});
		}
	};

	// Listen for events on both scrollingElement and window
	// - On Android, scrollingElement.addEventListener('scroll', callback) doesn't call callback on
	// scroll. However, window.addEventListener('scroll', callback) does.
	// - iOS needs a listener to be added to scrollingElement -- events aren't received when
	//   the listener is added to window with window.addEventListener('scroll', ...).
	document.scrollingElement?.addEventListener('scroll', onMainContentScroll);
	window.addEventListener('scroll', onMainContentScroll);
};

