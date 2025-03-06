import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { dirname } from '@joplin/lib/path-utils';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import shim from '@joplin/lib/shim';
import { useRef, useState } from 'react';
import { ExtraContentScriptSource } from '../bundledJs/types';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('NoteBodyViewer/hooks/useContentScripts');

// Most of the time, we don't actually need to reload the content scripts from a file,
// which can be slow.
//
// As such, we cache content scripts and do two renders:
// 1. The first render uses the cached content scripts.
//    While the first render is happening, we load content scripts from disk and compare them
//    to the cache.
//    If the same, we skip the second render.
// 2. The second render happens only if the cached content scripts changed.
//
type ContentScriptsCache = Record<string, ExtraContentScriptSource[]>;
let contentScriptsCache: ContentScriptsCache = {};

const useContentScripts = (pluginStates: PluginStates) => {
	const [contentScripts, setContentScripts] = useState(() => {
		const initialContentScripts = [];

		for (const pluginId in pluginStates) {
			if (pluginId in contentScriptsCache) {
				initialContentScripts.push(...contentScriptsCache[pluginId]);
			}
		}

		return initialContentScripts;
	});

	const contentScriptsRef = useRef(null);
	contentScriptsRef.current = contentScripts;

	// We load content scripts asynchronously because dynamic require doesn't
	// work in React Native.
	useAsyncEffect(async (event) => {
		const newContentScripts: ExtraContentScriptSource[] = [];
		const oldContentScripts = contentScriptsRef.current;
		let differentFromLastContentScripts = false;
		const newContentScriptsCache: ContentScriptsCache = {};

		logger.debug('Loading content scripts...');

		for (const pluginId in pluginStates) {
			const markdownItContentScripts = pluginStates[pluginId].contentScripts[ContentScriptType.MarkdownItPlugin];
			if (!markdownItContentScripts) continue;
			const loadedPluginContentScripts: ExtraContentScriptSource[] = [];

			for (const contentScript of markdownItContentScripts) {
				logger.info('Loading content script from', contentScript.path);
				const content = await shim.fsDriver().readFile(contentScript.path, 'utf8');
				if (event.cancelled) return;

				const contentScriptModule = `(function () {
					const exports = {};
					const module = { exports: exports };

					${content}

					return (module.exports || exports).default;
				})()`;

				if (contentScriptModule.length > 1024 * 1024) {
					const size = Math.round(contentScriptModule.length / 1024) / 1024;
					logger.warn(
						`Plugin ${pluginId}:`,
						`Loaded large content script with size ${size} MiB and ID ${contentScript.id}.`,
						'Large content scripts can slow down the renderer.',
					);
				}

				if (oldContentScripts[newContentScripts.length]?.js !== contentScriptModule) {
					differentFromLastContentScripts = true;
				}

				loadedPluginContentScripts.push({
					id: contentScript.id,
					js: contentScriptModule,
					assetPath: dirname(contentScript.path),
					pluginId: pluginId,
				});
			}

			newContentScriptsCache[pluginId] = loadedPluginContentScripts;
			newContentScripts.push(...loadedPluginContentScripts);
		}

		differentFromLastContentScripts ||= newContentScripts.length !== oldContentScripts.length;
		if (differentFromLastContentScripts) {
			contentScriptsCache = newContentScriptsCache;
			setContentScripts(newContentScripts);
		} else {
			logger.debug(`Re-using all ${oldContentScripts.length} content scripts.`);
		}
	}, [pluginStates, setContentScripts]);

	return contentScripts;
};

export default useContentScripts;
