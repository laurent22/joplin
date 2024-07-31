import { LogMessageCallback, ContentScriptData } from '../../types';
import CodeMirrorControl from '../CodeMirrorControl';
import codeMirrorRequire from './codeMirrorRequire';

let pluginScriptIdCounter = 0;
let pluginLoaderCounter = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type OnScriptLoadCallback = (exports: any)=> void;
type OnPluginRemovedCallback = ()=> void;

const contentScriptToId = (contentScript: ContentScriptData) => `${contentScript.pluginId}--${contentScript.contentScriptId}`;

export default class PluginLoader {
	private pluginScriptsContainer: HTMLElement;
	private loadedContentScriptIds: string[] = [];
	private pluginRemovalCallbacks: Record<string, OnPluginRemovedCallback> = {};
	private pluginLoaderId: number;

	public constructor(private editor: CodeMirrorControl, private logMessage: LogMessageCallback) {
		this.pluginScriptsContainer = document.createElement('div');
		this.pluginScriptsContainer.style.display = 'none';

		// For testing
		this.pluginScriptsContainer.id = 'joplin-plugin-scripts-container';

		document.body.appendChild(this.pluginScriptsContainer);

		// addPlugin works by creating <script> elements with the plugin's content. To pass
		// information to this <script>, we use global objects:
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(window as any).__pluginLoaderScriptLoadCallbacks ??= Object.create(null);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(window as any).__pluginLoaderRequireFunctions ??= Object.create(null);

		this.pluginLoaderId = pluginLoaderCounter++;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(window as any).__pluginLoaderRequireFunctions[this.pluginLoaderId] = codeMirrorRequire;
	}

	public async setPlugins(contentScripts: ContentScriptData[]) {
		for (const contentScript of contentScripts) {
			const id = contentScriptToId(contentScript);
			if (!this.loadedContentScriptIds.includes(id)) {
				this.addPlugin(contentScript);
			}
		}

		// Remove old plugins
		const contentScriptIds = contentScripts.map(contentScriptToId);
		const removedIds = this.loadedContentScriptIds
			.filter(id => !contentScriptIds.includes(id));

		for (const id of removedIds) {
			if (id in this.pluginRemovalCallbacks) {
				this.pluginRemovalCallbacks[id]();
			}
		}
	}

	private addPlugin(plugin: ContentScriptData) {
		const onRemoveCallbacks: OnPluginRemovedCallback[] = [];

		this.logMessage(`Loading plugin ${plugin.pluginId}, content script ${plugin.contentScriptId}`);

		const addScript = (onLoad: OnScriptLoadCallback) => {
			const scriptElement = document.createElement('script');

			onRemoveCallbacks.push(() => {
				scriptElement.remove();
			});

			void (async () => {
				const scriptId = pluginScriptIdCounter++;
				const js = await plugin.contentScriptJs();

				// Stop if cancelled
				if (!this.loadedContentScriptIds.includes(contentScriptToId(plugin))) {
					return;
				}

				scriptElement.appendChild(document.createTextNode(`
				(async () => {
					const exports = {};
					const module = { exports: exports };
					const require = window.__pluginLoaderRequireFunctions[${JSON.stringify(this.pluginLoaderId)}];
					const joplin = {
						require,
					};
		
					${js};
		
					window.__pluginLoaderScriptLoadCallbacks[${JSON.stringify(scriptId)}](module.exports);
				})();
				`));

				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(window as any).__pluginLoaderScriptLoadCallbacks[scriptId] = onLoad;

				this.pluginScriptsContainer.appendChild(scriptElement);
			})();
		};

		const addStyles = (cssStrings: string[]) => {
			// A container for style elements
			const styleContainer = document.createElement('div');

			onRemoveCallbacks.push(() => {
				styleContainer.remove();
			});

			for (const cssText of cssStrings) {
				const style = document.createElement('style');
				style.innerText = cssText;
				styleContainer.appendChild(style);
			}

			this.pluginScriptsContainer.appendChild(styleContainer);
		};

		this.pluginRemovalCallbacks[contentScriptToId(plugin)] = () => {
			for (const callback of onRemoveCallbacks) {
				callback();
			}

			this.loadedContentScriptIds = this.loadedContentScriptIds.filter(id => {
				return id !== contentScriptToId(plugin);
			});
		};

		addScript(async exports => {
			if (!exports?.default || !(typeof exports.default === 'function')) {
				throw new Error('All plugins must have a function default export');
			}

			const context = {
				postMessage: plugin.postMessageHandler,
				pluginId: plugin.pluginId,
				contentScriptId: plugin.contentScriptId,
			};
			const loadedPlugin = exports.default(context) ?? {};

			loadedPlugin.plugin?.(this.editor);

			if (loadedPlugin.codeMirrorOptions) {
				for (const key in loadedPlugin.codeMirrorOptions) {
					this.editor.setOption(key, loadedPlugin.codeMirrorOptions[key]);
				}
			}

			if (loadedPlugin.assets) {
				const cssStrings = [];

				for (const asset of loadedPlugin.assets()) {
					let assetText: string = asset.text;
					let assetMime: string = asset.mime;

					if (!asset.inline) {
						if (!asset.name) {
							throw new Error('Non-inline asset missing required property "name"');
						}
						if (assetMime !== 'text/css' && !asset.name.endsWith('.css')) {
							throw new Error(
								`Non-css assets are not supported by the CodeMirror 6 editor. (Asset path: ${asset.name})`,
							);
						}

						assetText = await plugin.loadCssAsset(asset.name);
						assetMime = 'text/css';
					}

					if (assetMime !== 'text/css') {
						throw new Error(
							'Plugin assets must have property "mime" set to "text/css" or have a filename ending with ".css"',
						);
					}

					cssStrings.push(assetText);
				}

				addStyles(cssStrings);
			}
		});

		this.loadedContentScriptIds.push(contentScriptToId(plugin));
	}

	public remove() {
		this.pluginScriptsContainer.remove();
	}
}

