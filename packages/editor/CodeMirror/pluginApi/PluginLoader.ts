import { LogMessageCallback, PluginData } from '../../types';
import CodeMirrorControl from '../CodeMirrorControl';
import codeMirrorRequire from './codeMirrorRequire';

let pluginScriptIdCounter = 0;
let pluginLoaderCounter = 0;

type OnScriptLoadCallback = (exports: any)=> void;
type OnPluginRemovedCallback = ()=> void;

export default class PluginLoader {
	private pluginScriptsContainer: HTMLElement;
	private loadedPluginIds: string[] = [];
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
		(window as any).__pluginLoaderScriptLoadCallbacks ??= Object.create(null);
		(window as any).__pluginLoaderRequireFunctions ??= Object.create(null);

		this.pluginLoaderId = pluginLoaderCounter++;
		(window as any).__pluginLoaderRequireFunctions[this.pluginLoaderId] = codeMirrorRequire;
	}

	public async setPlugins(plugins: PluginData[]) {
		for (const plugin of plugins) {
			if (!this.loadedPluginIds.includes(plugin.pluginId)) {
				this.addPlugin(plugin);
			}
		}

		// Remove old plugins
		const pluginIds = plugins.map(plugin => plugin.pluginId);
		const removedIds = this.loadedPluginIds
			.filter(id => !pluginIds.includes(id));

		for (const id of removedIds) {
			if (id in this.pluginRemovalCallbacks) {
				this.pluginRemovalCallbacks[id]();
			}
		}
	}

	private addPlugin(plugin: PluginData) {
		const onRemoveCallbacks: OnPluginRemovedCallback[] = [];

		this.logMessage(`Loading plugin ${plugin.pluginId}`);

		const addScript = (onLoad: OnScriptLoadCallback) => {
			const scriptElement = document.createElement('script');

			onRemoveCallbacks.push(() => {
				scriptElement.remove();
			});

			void (async () => {
				const scriptId = pluginScriptIdCounter++;
				const js = await plugin.contentScriptJs();

				// Stop if cancelled
				if (!this.loadedPluginIds.includes(plugin.pluginId)) {
					return;
				}

				scriptElement.innerText = `
				(async () => {
					const exports = {};
					const require = window.__pluginLoaderRequireFunctions[${JSON.stringify(this.pluginLoaderId)}];
					const joplin = {
						require,
					};
		
					${js};
		
					window.__pluginLoaderScriptLoadCallbacks[${JSON.stringify(scriptId)}](exports);
				})();
				`;

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

		this.pluginRemovalCallbacks[plugin.pluginId] = () => {
			for (const callback of onRemoveCallbacks) {
				callback();
			}

			this.loadedPluginIds = this.loadedPluginIds.filter(id => {
				return id !== plugin.pluginId;
			});
		};

		addScript(exports => {
			if (!exports?.default || !(typeof exports.default === 'function')) {
				throw new Error('All plugins must have a function default export');
			}

			const context = {
				postMessage: plugin.postMessageHandler,
				pluginId: plugin.pluginId,
				contentScriptId: plugin.contentScriptId,
			};
			const loadedPlugin = exports.default(context);

			loadedPlugin.plugin?.(this.editor);

			if (loadedPlugin.codeMirrorOptions) {
				for (const key in loadedPlugin.codeMirrorOptions) {
					this.editor.setOption(key, loadedPlugin.codeMirrorOptions[key]);
				}
			}

			if (loadedPlugin.assets) {
				const cssStrings = [];

				for (const asset of loadedPlugin.assets()) {
					if (!asset.inline) {
						this.logMessage('Warning: The CM6 plugin API currently only supports inline CSS.');
						continue;
					}

					if (asset.mime !== 'text/css') {
						throw new Error('Inline assets must have property "mime" set to "text/css"');
					}

					cssStrings.push(asset.text);
				}

				addStyles(cssStrings);
			}
		});

		this.loadedPluginIds.push(plugin.pluginId);
	}

	public remove() {
		this.pluginScriptsContainer.remove();
	}
}

