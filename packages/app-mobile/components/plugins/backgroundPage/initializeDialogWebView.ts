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
	let contentResizeObserver: ResizeObserver|null = null;
	let observedElement: HTMLElement|null = null;
	let observedContentSize: { width: number; height: number }|null = null;
	let pageHideListenerRegistered = false;

	const measureContent = (element: HTMLElement) => {
		const viewportWidth = document.documentElement.clientWidth;
		const scrollbarWidth = Math.max(0, window.innerWidth - viewportWidth);
		// Include the scrollbar gutter when the content fills the viewport so feeding this
		// measurement back into the iframe does not repeatedly shrink it.
		const width = element.clientWidth === viewportWidth ? element.clientWidth + scrollbarWidth : element.clientWidth;
		return { width, height: element.clientHeight };
	};
	const stopObservingContentSize = () => {
		contentResizeObserver?.disconnect();
		contentResizeObserver = null;
		observedElement = null;
		observedContentSize = null;
		if (pageHideListenerRegistered) {
			window.removeEventListener('pagehide', stopObservingContentSize);
			pageHideListenerRegistered = false;
		}
	};
	const observeContentSize = (element: HTMLElement) => {
		if (observedElement === element && contentResizeObserver) return;

		stopObservingContentSize();
		observedElement = element;
		observedContentSize = measureContent(element);
		contentResizeObserver = new ResizeObserver(() => {
			if (observedElement === element) observedContentSize = measureContent(element);
		});
		contentResizeObserver.observe(element, { box: 'border-box' });
		window.addEventListener('pagehide', stopObservingContentSize);
		pageHideListenerRegistered = true;
	};

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
		runScript: async (key: string, scriptData: string) => {
			if (loadedPaths.has(key)) {
				return;
			}
			loadedPaths.add(key);

			if (key.endsWith('.css')) {
				const stylesheetLink = document.createElement('style');
				stylesheetLink.appendChild(document.createTextNode(scriptData));
				document.head.appendChild(stylesheetLink);
			} else {
				const script = document.createElement('script');
				script.appendChild(document.createTextNode(scriptData));
				document.head.appendChild(script);
			}
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
		getContentSize: async (watchForSizeChanges = false) => {
			// To convert to React Native pixel units from browser pixel units,
			// we need to multiply by the devicePixelRatio:
			const dpr = window.devicePixelRatio ?? 1;

			const element = document.getElementById('joplin-plugin-content') ?? document.body;
			if (watchForSizeChanges) {
				observeContentSize(element);
			} else {
				stopObservingContentSize();
			}
			const contentSize = observedContentSize ?? measureContent(element);
			return {
				width: contentSize.width * dpr,
				height: contentSize.height * dpr,
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
