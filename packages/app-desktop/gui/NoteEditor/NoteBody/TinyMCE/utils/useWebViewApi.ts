import PluginService from '@joplin/lib/services/plugins/PluginService';
import { useEffect } from 'react';
import { Editor } from 'tinymce';

interface WebViewApi {
	postMessage: (contentScriptId: string, message: unknown)=> Promise<unknown>;
}

interface ExtendedWindow extends Window {
	webviewApi: WebViewApi;
}

const useWebViewApi = (editor: Editor, containerWindow: Window) => {
	useEffect(() => {
		if (!editor) return ()=>{};
		if (!containerWindow) return ()=>{};

		const editorWindow = editor.getWin() as ExtendedWindow;
		const webviewApi: WebViewApi = {
			postMessage: async (contentScriptId: string, message: unknown) => {
				const pluginService = PluginService.instance();
				const plugin = pluginService.pluginById(
					pluginService.pluginIdByContentScriptId(contentScriptId),
				);
				return await plugin.emitContentScriptMessage(contentScriptId, message);
			},
		};
		editorWindow.webviewApi = webviewApi;

		return () => {
			if (editorWindow.webviewApi === webviewApi) {
				editorWindow.webviewApi = undefined;
			}
		};
	}, [editor, containerWindow]);
};

export default useWebViewApi;
