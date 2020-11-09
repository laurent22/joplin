import { useEffect, useState } from 'react';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { contentScriptsToCodeMirrorPlugin } from '@joplin/lib/services/plugins/utils/loadContentScripts';
import { resolve, extname } from 'path';


export default function useExternalPlugins(CodeMirror: any, plugins: PluginStates) {

	const [options, setOptions] = useState({});
	useEffect(() => {
		let newOptions = {};

		const contentScripts = contentScriptsToCodeMirrorPlugin(plugins);

		for (const contentScript of contentScripts) {
			const mod = contentScript.module;
			for (const addon of mod.addons) {
				require(`codemirror/addon/${addon}`);
			}
			if (mod.codeMirrorOptions) {
				newOptions = Object.assign({}, newOptions, mod.codeMirrorOptions);
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
						addScript(resolve(contentScript.assetPath, asset.name), mod.id);
					}
				}

				addInlineCss(cssStrings, mod.id);
			}

			mod.plugin(CodeMirror);
		}
		setOptions(newOptions);
	}, [plugins]);

	function addInlineCss(cssStrings: string[], id: string) {
		const element = document.createElement('style');
		element.setAttribute('id', `${id}-inline`);
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(cssStrings.join('\n')));
	}

	function addScript(path: string, id: string) {
		const element = document.createElement('link');
		element.setAttribute('id', `${id}-link`);
		element.setAttribute('rel', 'stylesheet');
		element.setAttribute('href', path);
		document.head.appendChild(element);
	}

	return options;
}
