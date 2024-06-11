
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { NoteViewerLocalApi, NoteViewerRemoteApi, RendererWebViewOptions } from './types';
import Renderer from './Renderer';

declare global {
	interface Window {
		rendererWebViewOptions: RendererWebViewOptions;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
declare const webviewLib: any;

const messenger = new WebViewToRNMessenger<NoteViewerLocalApi, NoteViewerRemoteApi>(
	'note-viewer',
	null,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
(window as any).joplinPostMessage_ = (message: string, _args: any) => {
	return messenger.remoteApi.onPostMessage(message);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
(window as any).webviewApi = {
	postMessage: messenger.remoteApi.onPostPluginMessage,
};

webviewLib.initialize({
	postMessage: (message: string) => {
		messenger.remoteApi.onPostMessage(message);
	},
});

const renderer = new Renderer({
	...window.rendererWebViewOptions,
	fsDriver: messenger.remoteApi.fsDriver,
});

messenger.setLocalInterface({
	renderer,
	jumpToHash: (hash: string) => {
		location.hash = `#${hash}`;
	},
});

const lastScrollTop: number|null = null;
const onMainContentScroll = () => {
	const newScrollTop = document.scrollingElement.scrollTop;
	if (lastScrollTop !== newScrollTop) {
		messenger.remoteApi.onScroll(newScrollTop);
	}
};

// Listen for events on both scrollingElement and window
// - On Android, scrollingElement.addEventListener('scroll', callback) doesn't call callback on
// scroll. However, window.addEventListener('scroll', callback) does.
// - iOS needs a listener to be added to scrollingElement -- events aren't received when
//   the listener is added to window with window.addEventListener('scroll', ...).
document.scrollingElement.addEventListener('scroll', onMainContentScroll);
window.addEventListener('scroll', onMainContentScroll);
