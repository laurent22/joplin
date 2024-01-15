import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';
import { DialogLocalApi, DialogRemoteApi } from '../types';
import reportUnhandledErrors from './utils/reportUnhandledErrors';

let iframeCssElement: HTMLStyleElement|null = null;

const initializeDialogIframe = (messageChannelId: string) => {
	const localApi = {
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
		setCss: (css: string) => {
			iframeCssElement?.remove?.();
			const styleElement = document.createElement('style');
			styleElement.appendChild(document.createTextNode(css));
			document.body.appendChild(styleElement);
			iframeCssElement = styleElement;
		},
		getContentSize: async () => {
			return {
				width: document.scrollingElement.scrollWidth,
				height: document.scrollingElement.scrollHeight,
			};
		},
		// No-op -- handled by parent window
		setButtons: () => {},
		closeDialog: () => {},
	};
	const messenger = new WindowMessenger<DialogLocalApi, DialogRemoteApi>(messageChannelId, parent, localApi);

	(window as any).webviewApi = {
		postMessage: messenger.remoteApi.postMessage,
		onMessage: messenger.remoteApi.onMessage,
	};

	reportUnhandledErrors(messenger.remoteApi.onError);
};

export default initializeDialogIframe;
