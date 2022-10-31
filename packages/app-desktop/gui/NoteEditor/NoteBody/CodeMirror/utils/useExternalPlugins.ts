import { useEffect, useState } from 'react';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { contentScriptsToCodeMirrorPlugin } from '@joplin/lib/services/plugins/utils/loadContentScripts';
import { extname } from 'path';
import shim from '@joplin/lib/shim';
import uuid from '@joplin/lib/uuid';

import { reg } from '@joplin/lib/registry';

const loadedPluginIdSet = new Set<string>();

export default function useExternalPlugins(CodeMirror: any, plugins: PluginStates) {

	const [options, setOptions] = useState({});
	useEffect(() => {
		let newOptions = {};

		const contentScripts = contentScriptsToCodeMirrorPlugin(plugins);

		for (const contentScript of contentScripts) {
			try {

				const mod = contentScript.module;

				if (mod.codeMirrorResources) {
					for (const asset of mod.codeMirrorResources) {
						try {
							require(`codemirror/${asset}`);
						} catch (error) {
							error.message = `${asset} is not a valid CodeMirror asset, keymap or mode. You can find a list of valid assets here: https://codemirror.net/doc/manual.html#addons`;
							throw error;
						}
					}
				}

				if (mod.codeMirrorOptions) {
					newOptions = Object.assign({}, newOptions, mod.codeMirrorOptions);
				}

				if (loadedPluginIdSet.has(contentScript.id)) {
					continue;
				}

				if (mod.assets) {
					const cssStrings = [];

					for (const asset of mod.assets()) {
						let mime = asset.mime;

						if (!mime && asset.inline) throw new Error('Mime type is required for inline assets');

						if (!mime && asset.name) {
							const ext = extname(asset.name).toLowerCase();
							if (ext === '.css') mime = 'text/css';
						}

						if (mime !== 'text/css') throw new Error('Only css assets are supported for CodeMirror plugins');

						if (asset.inline) {
							cssStrings.push(asset.text);
						} else {
							addScript(shim.fsDriver().resolveRelativePathWithinDir(contentScript.assetPath, asset.name), contentScript.id);
						}
					}

					if (cssStrings.length > 0) {
						addInlineCss(cssStrings, contentScript.id);
					}
				}

				if (mod.plugin) {
					mod.plugin(CodeMirror);
				}

				loadedPluginIdSet.add(contentScript.id);
			} catch (error) {
				reg.logger().error(error.toString());
			}
		}
		setOptions(newOptions);
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [plugins]);

	function addInlineCss(cssStrings: string[], id: string) {
		const element = document.createElement('style');
		element.setAttribute('id', `content-script-${id}-inline-${uuid.createNano()}`);
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(cssStrings.join('\n')));
	}

	function addScript(path: string, id: string) {
		const element = document.createElement('link');
		element.setAttribute('id', `content-script-${id}-link-${uuid.createNano()}`);
		element.setAttribute('rel', 'stylesheet');
		element.setAttribute('href', path);
		document.head.appendChild(element);
	}

	return options;
}
