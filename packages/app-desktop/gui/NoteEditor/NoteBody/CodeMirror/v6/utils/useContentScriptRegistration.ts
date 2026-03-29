import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import { ContentScriptData, ContentScriptLoadOptions } from '@joplin/editor/types';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import shim from '@joplin/lib/shim';
import { dirname } from 'path';
import { useEffect, useId, useRef } from 'react';
import bridge from '../../../../../../services/bridge';
import type { ContentScriptRegistration } from '../../../../../../utils/customProtocols/handleCustomProtocols';

interface Props {
	editor: CodeMirrorControl;
	pluginStates: PluginStates;
}

const useContentScriptRegistration = ({ editor, pluginStates }: Props) => {
	const loadedContentScriptRefs = useRef(new Map<string, ContentScriptRegistration>());

	const editorId = useId();
	useEffect(() => {
		if (!editor) {
			return;
		}

		const contentScripts: ContentScriptData[] = [];
		for (const pluginId in pluginStates) {
			const pluginState = pluginStates[pluginId];
			const codeMirrorContentScripts = pluginState.contentScripts[ContentScriptType.CodeMirrorPlugin] ?? [];

			for (const contentScript of codeMirrorContentScripts) {
				// Ensure that the key is unique to the (pluginId, editorId, contentScript) set.
				// Include the plugin ID to prevent ID collisions if multiple plugins register
				// content scripts with the same ID:
				const scriptId = `${pluginId}::${contentScript.id}`;
				loadedContentScriptRefs.current.get(scriptId)?.revoke();

				contentScripts.push({
					pluginId,
					contentScriptId: contentScript.id,
					contentScriptJs: async (context) => {
						const handle = await registerContentScriptWithMainProcess({
							scriptPath: contentScript.path,
							context,

							key: `${editorId}::${scriptId}`,
						});
						loadedContentScriptRefs.current.set(scriptId, handle);

						return { uri: handle.uri };
					},
					loadCssAsset: (name: string) => {
						const assetPath = dirname(contentScript.path);
						const path = shim.fsDriver().resolveRelativePathWithinDir(assetPath, name);
						return shim.fsDriver().readFile(path, 'utf8');
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					postMessageHandler: (message: any) => {
						const plugin = PluginService.instance().pluginById(pluginId);
						return plugin.emitContentScriptMessage(contentScript.id, message);
					},
				});
			}
		}

		void editor.setContentScripts(contentScripts);
	}, [editor, pluginStates, editorId]);

	useEffect(() => () => {
		for (const script of loadedContentScriptRefs.current.values()) {
			script.revoke();
		}
		loadedContentScriptRefs.current.clear();
	}, []);
};

interface RegisterContentScriptOptions {
	key: string; // A unique identifier for the content script
	scriptPath: string;
	context: ContentScriptLoadOptions;
}

const registerContentScriptWithMainProcess = async (
	{ key, scriptPath, context }: RegisterContentScriptOptions,
) => {
	const contentScriptJs = [
		context.contentScriptStartJs,
		await shim.fsDriver().readFile(scriptPath),
		context.contentScriptEndJs,
	].join('\n');

	const content = bridge().electronApp().getPluginProtocolHandler().registerContentScript(
		encodeURIComponent(key),
		contentScriptJs,
	);
	return content;
};

export default useContentScriptRegistration;
