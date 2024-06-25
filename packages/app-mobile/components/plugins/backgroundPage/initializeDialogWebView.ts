import { DialogWebViewApi, DialogMainProcessApi, WebViewPostMessageCallback, DialogSetOnMessageListenerCallback } from '../types';
import reportUnhandledErrors from './utils/reportUnhandledErrors';
import wrapConsoleLog from './utils/wrapConsoleLog';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import getFormData from './utils/getFormData';

interface ExtendedWindow extends Window {
	webviewApi: {
		postMessage: WebViewPostMessageCallback;
		onMessage: DialogSetOnMessageListenerCallback;
	};
	exports: Record<string, unknown>;
}

declare const window: ExtendedWindow;

let themeCssElement: HTMLStyleElement|null = null;

const initializeDialogWebView = (messageChannelId: string) => {
	const loadedPaths: Set<string> = new Set();

	type ScriptType = 'js'|'css';
	const includeScriptsOrStyles = (type: ScriptType, paths: string[]) => {
		for (const path of paths) {
			if (loadedPaths.has(path)) {
				continue;
			}
			loadedPaths.add(path);

			if (type === 'css') {
				const stylesheetLink = document.createElement('link');
				stylesheetLink.rel = 'stylesheet';
				stylesheetLink.href = path;
				document.head.appendChild(stylesheetLink);
			} else {
				const script = document.createElement('script');
				script.src = path;
				document.head.appendChild(script);
			}
		}
	};

	const localApi: DialogWebViewApi = {
		includeCssFiles: async (paths: string[]) => {
			return includeScriptsOrStyles('css', paths);
		},
		includeJsFiles: async (paths: string[]) => {
			return includeScriptsOrStyles('js', paths);
		},
		getFormData: async () => {
			return getFormData();
		},
		setThemeCss: async (css: string) => {
			themeCssElement?.remove?.();
			const styleElement = document.createElement('style');
			styleElement.appendChild(document.createTextNode(css));
			document.body.appendChild(styleElement);
			themeCssElement = styleElement;
		},
		getContentSize: async () => {
			// To convert to React Native pixel units from browser pixel units,
			// we need to multiply by the devicePixelRatio:
			const dpr = window.devicePixelRatio ?? 1;

			const element = document.getElementById('joplin-plugin-content') ?? document.body;
			return {
				width: element.clientWidth * dpr,
				height: element.clientHeight * dpr,
			};
		},
	};
	const messenger = new WebViewToRNMessenger<DialogWebViewApi, DialogMainProcessApi>(messageChannelId, localApi);

	window.webviewApi = {
		postMessage: messenger.remoteApi.postMessage,
		onMessage: messenger.remoteApi.onMessage,
	};

	reportUnhandledErrors(messenger.remoteApi.onError);
	wrapConsoleLog(messenger.remoteApi.onLog);

	// If dialog content scripts were bundled with Webpack for NodeJS,
	// they may expect a global "exports" to be present.
	window.exports ??= {};
};

export default initializeDialogWebView;
