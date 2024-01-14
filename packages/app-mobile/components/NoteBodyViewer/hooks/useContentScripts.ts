import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { dirname } from '@joplin/lib/path-utils';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import shim from '@joplin/lib/shim';
import { useState } from 'react';
import { ExtraContentScriptSource } from '../bundledJs/types';

const useContentScripts = (pluginStates: PluginStates) => {
	const [contentScripts, setContentScripts] = useState([]);

	// We load content scripts asynchronously because dynamic require doesn't
	// work in React Native.
	useAsyncEffect(async () => {
		const contentScripts: ExtraContentScriptSource[] = [];
		for (const pluginId in pluginStates) {
			const markdownItContentScripts = pluginStates[pluginId].contentScripts[ContentScriptType.MarkdownItPlugin];
			if (!markdownItContentScripts) continue;

			for (const contentScript of markdownItContentScripts) {
				const content = await shim.fsDriver().readFile(contentScript.path, 'utf8');

				const contentScriptModule = `(function () {
					const module = { exports: null };
					const exports = {};

					${content}

					return (module.exports || exports).default;
				})()`;

				contentScripts.push({
					id: contentScript.id,
					js: contentScriptModule,
					assetPath: dirname(contentScript.path),
					pluginId: pluginId,
				});
			}
		}

		setContentScripts(contentScripts);
	}, [pluginStates, setContentScripts]);

	return contentScripts;
};

export default useContentScripts;
