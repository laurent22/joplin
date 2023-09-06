import { PluginData } from '../types';
import CodeMirrorControl from './CodeMirrorControl';

let pluginScriptIdCounter = 0;

type OnScriptLoadCallback = (exports: any)=> void;


export default class PluginLoader {
	private pluginScriptsContainer: HTMLElement;
	private loadedPluginIds: string[] = [];
	private pluginRemovalCallbacks: Record<string, ()=> void> = {};

	public constructor(private editor: CodeMirrorControl) {
		this.pluginScriptsContainer = document.createElement('div');
		this.pluginScriptsContainer.style.display = 'none';
		document.body.appendChild(this.pluginScriptsContainer);

		(window as any).scriptLoadCallbacks ??= Object.create(null);
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
		const addScript = (onLoad: OnScriptLoadCallback) => {
			const scriptElement = document.createElement('script');

			this.pluginRemovalCallbacks[plugin.pluginId] = () => {
				scriptElement.remove();
				this.loadedPluginIds = this.loadedPluginIds.filter(id => {
					return id !== plugin.pluginId;
				});
			};

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
		
					${js};
		
					window.scriptLoadCallbacks[${scriptId}](exports);
				})();
				`;

				(window as any).scriptLoadCallbacks[scriptId] = onLoad;

				this.pluginScriptsContainer.appendChild(scriptElement);
			})();
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
		});

		this.loadedPluginIds.push(plugin.pluginId);
	}

	public remove() {
		this.pluginScriptsContainer.remove();
	}
}
