import { DialogWebViewApi, DialogMainProcessApi } from '../types';
import reportUnhandledErrors from './utils/reportUnhandledErrors';
import wrapConsoleLog from './utils/wrapConsoleLog';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import fixEmptyLinks from './utils/fixEmptyLinks';

let themeCssElement: HTMLStyleElement|null = null;

const initializeDialogWebView = (messageChannelId: string) => {
	const localApi: DialogWebViewApi = {
		includeCssFiles: async (paths: string[]) => {
			for (const path of paths) {
				const stylesheetLink = document.createElement('link');
				stylesheetLink.rel = 'stylesheet';
				stylesheetLink.href = path;
				document.head.appendChild(stylesheetLink);
			}
		},
		includeJsFiles: async (paths: string[]) => {
			for (const path of paths) {
				const script = document.createElement('script');
				script.src = path;
				document.head.appendChild(script);
			}
		},
		getFormData: async () => {
			const firstForm = document.querySelector('form');
			if (!firstForm) return null;

			const formData = new FormData(firstForm);

			const result = Object.create(null);
			for (const key of formData.keys()) {
				result[key] = formData.get(key);
			}
			return result;
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

			return {
				width: document.body.clientWidth * dpr,
				height: document.body.clientHeight * dpr,
			};
		},
	};
	const messenger = new WebViewToRNMessenger<DialogWebViewApi, DialogMainProcessApi>(messageChannelId, localApi);

	(window as any).webviewApi = {
		postMessage: messenger.remoteApi.postMessage,
		onMessage: messenger.remoteApi.onMessage,
	};

	reportUnhandledErrors(messenger.remoteApi.onError);
	wrapConsoleLog(messenger.remoteApi.onLog);
	fixEmptyLinks();

	// If dialog content scripts were bundled with Webpack for NodeJS,
	// they may expect a global "exports" to be present.
	(window as any).exports ??= {};
};

export default initializeDialogWebView;
