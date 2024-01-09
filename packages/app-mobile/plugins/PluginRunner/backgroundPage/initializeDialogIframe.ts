import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';
import { DialogLocalApi, DialogRemoteApi } from '../types';

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
		addCss: (css: string) => {
			const styleElement = document.createElement('style');
			styleElement.appendChild(document.createTextNode(css));
			document.body.appendChild(styleElement);
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
};

export default initializeDialogIframe;
