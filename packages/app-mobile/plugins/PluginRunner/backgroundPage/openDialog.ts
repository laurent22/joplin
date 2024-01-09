import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { DialogLocalApi, DialogRemoteApi } from '../types';
import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import type { PluginViewState } from '@joplin/lib/services/plugins/reducer';
import makeSandboxedIframe from './utils/makeSandboxedIframe';

const initializeMessengers = (
	messageChannelId: string,
	iframe: HTMLIFrameElement,
	setButtons: (buttons: ButtonSpec[])=> void,
	closeDialog: ()=> void,
) => {
	// We connect the dialog iframe and ReactNative so that React Native messages
	// reach the iframe (and the reverse).
	const rnConnection = new WebViewToRNMessenger<DialogLocalApi, DialogRemoteApi>(
		messageChannelId, null,
	);
	const iframeConnection = new WindowMessenger<DialogRemoteApi, DialogLocalApi>(
		messageChannelId, iframe.contentWindow, rnConnection.remoteApi,
	);

	rnConnection.setIsChainedMessenger(true);
	iframeConnection.setIsChainedMessenger(true);

	rnConnection.setLocalInterface({
		getFormData: iframeConnection.remoteApi.getFormData,
		addCss: iframeConnection.remoteApi.addCss,
		setButtons,
		closeDialog,
	});

	return { rnConnection, iframeConnection };
};

const openDialog = async (messageChannelId: string, pluginBackgroundScript: string, dialogInfo: PluginViewState) => {
	const scripts = [
		`
			${pluginBackgroundScript}
			pluginBackgroundPage.initializeDialogIframe(${JSON.stringify(messageChannelId)});
		`,
		...dialogInfo.scripts,
	];
	const dialogContainer: HTMLDialogElement = document.createElement('dialog');
	const { iframe, loadPromise } = makeSandboxedIframe(dialogInfo.html, scripts);
	const buttonRow = document.createElement('div');

	dialogContainer.replaceChildren(iframe, buttonRow);
	document.body.appendChild(dialogContainer);
	dialogContainer.showModal();

	await loadPromise;



	let iframeConnection: RemoteMessenger<DialogRemoteApi, DialogLocalApi>|null = null;
	let rnConnection: RemoteMessenger<DialogLocalApi, DialogRemoteApi>|null = null;

	const closeDialog = () => {
		dialogContainer.remove();
		rnConnection.remoteApi.onDismiss();
		iframeConnection.closeConnection();
		rnConnection.closeConnection();
	};

	const setButtons = (buttonInfos: ButtonSpec[]) => {
		buttonRow.replaceChildren();

		for (const buttonInfo of buttonInfos) {
			const button = document.createElement('button');
			button.innerText = buttonInfo.title ?? '❓';
			button.onclick = async () => {
				if (buttonInfo.id === 'ok') {
					rnConnection.remoteApi.onSubmit(await iframeConnection.remoteApi.getFormData());
				}

				buttonInfo.onClick?.();
				closeDialog();
			};
			buttonRow.appendChild(button);
		}
	};

	const messengers = initializeMessengers(messageChannelId, iframe, setButtons, closeDialog);
	iframeConnection = messengers.iframeConnection;
	rnConnection = messengers.rnConnection;
};

export default openDialog;
