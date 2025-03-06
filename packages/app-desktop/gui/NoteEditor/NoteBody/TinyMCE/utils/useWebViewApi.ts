import PluginService from '@joplin/lib/services/plugins/PluginService';
import { useEffect } from 'react';
import { Editor } from 'tinymce';

const useWebViewApi = (editor: Editor, window: Window) => {
	useEffect(() => {
		if (!editor) return ()=>{};
		if (!window) return ()=>{};

		const scriptElement = window.document.createElement('script');
		const channelId = `plugin-post-message-${Math.random()}`;
		scriptElement.appendChild(window.document.createTextNode(`
			window.webviewApi = {
				postMessage: (contentScriptId, message) => {
					const channelId = ${JSON.stringify(channelId)};
					const messageId = Math.random();
					window.parent.postMessage({
						channelId,
						messageId,
						contentScriptId,
						message,
					}, '*');

					const waitForResponse = async () => {
						while (true) {
							const messageEvent = await new Promise(resolve => {
								window.addEventListener('message', event => {
									resolve(event);
								}, {once: true});
							});
	
							if (messageEvent.source !== window.parent || messageEvent.data.messageId !== messageId) {
								continue;
							}
	
							const data = messageEvent.data;
							return data.response;
						}
					};

					return waitForResponse();
				},
			};
		`));
		const editorWindow = editor.getWin();
		editorWindow.document.head.appendChild(scriptElement);

		const onMessageHandler = async (event: MessageEvent) => {
			if (event.source !== editorWindow || event.data.channelId !== channelId) {
				return;
			}

			const contentScriptId = event.data.contentScriptId;
			const pluginService = PluginService.instance();
			const plugin = pluginService.pluginById(
				pluginService.pluginIdByContentScriptId(contentScriptId),
			);
			const result = await plugin.emitContentScriptMessage(contentScriptId, event.data.message);
			editorWindow.postMessage({
				messageId: event.data.messageId,
				response: result,
			}, '*');
		};
		window.addEventListener('message', onMessageHandler);

		return () => {
			window.removeEventListener('message', onMessageHandler);
			scriptElement.remove();
		};
	}, [editor, window]);
};

export default useWebViewApi;
