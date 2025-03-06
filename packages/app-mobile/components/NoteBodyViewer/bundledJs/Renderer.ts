import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import type { MarkupToHtmlConverter, RenderOptions, RenderResultPluginAsset, FsDriver as RendererFsDriver } from '@joplin/renderer/types';
import makeResourceModel from './utils/makeResourceModel';
import addPluginAssets from './utils/addPluginAssets';
import { ExtraContentScriptSource } from './types';
import { ExtraContentScript } from '@joplin/lib/services/plugins/utils/loadContentScripts';

export interface RendererSetupOptions {
	settings: {
		safeMode: boolean;
		tempDir: string;
		resourceDir: string;
		resourceDownloadMode: string;
	};
	// True if asset and resource files should be transferred to the WebView before rendering.
	// This must be true on web, where asset and resource files are virtual and can't be accessed
	// without transferring.
	useTransferredFiles: boolean;

	fsDriver: RendererFsDriver;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pluginOptions: Record<string, any>;
}

export interface RendererSettings {
	theme: string;
	onResourceLoaded: ()=> void;
	highlightedKeywords: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	resources: Record<string, any>;
	codeTheme: string;
	noteHash: string;
	initialScroll: number;

	createEditPopupSyntax: string;
	destroyEditPopupSyntax: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pluginSettings: Record<string, any>;
	requestPluginSetting: (pluginId: string, settingKey: string)=> void;
	readAssetBlob: (assetPath: string)=> Promise<Blob>;
}

export interface MarkupRecord {
	language: MarkupLanguage;
	markup: string;
}

export default class Renderer {
	private markupToHtml: MarkupToHtmlConverter;
	private lastSettings: RendererSettings|null = null;
	private extraContentScripts: ExtraContentScript[] = [];
	private lastRenderMarkup: MarkupRecord|null = null;
	private resourcePathOverrides: Record<string, string> = Object.create(null);

	public constructor(private setupOptions: RendererSetupOptions) {
		this.recreateMarkupToHtml();
	}

	private recreateMarkupToHtml() {
		this.markupToHtml = new MarkupToHtml({
			extraRendererRules: this.extraContentScripts,
			fsDriver: this.setupOptions.fsDriver,
			isSafeMode: this.setupOptions.settings.safeMode,
			tempDir: this.setupOptions.settings.tempDir,
			ResourceModel: makeResourceModel(this.setupOptions.settings.resourceDir),
			pluginOptions: this.setupOptions.pluginOptions,
		});
	}

	// Intended for web, where resources can't be linked to normally.
	public async setResourceFile(id: string, file: Blob) {
		this.resourcePathOverrides[id] = URL.createObjectURL(file);
	}

	public getResourcePathOverride(resourceId: string) {
		if (Object.prototype.hasOwnProperty.call(this.resourcePathOverrides, resourceId)) {
			return this.resourcePathOverrides[resourceId];
		}
		return null;
	}

	public async setExtraContentScriptsAndRerender(
		extraContentScripts: ExtraContentScriptSource[],
	) {
		this.extraContentScripts = extraContentScripts.map(script => {
			const scriptModule = (eval(script.js))({
				pluginId: script.pluginId,
				contentScriptId: script.id,
			});

			if (!scriptModule.plugin) {
				throw new Error(`
					Expected content script ${script.id} to export a function that returns an object with a "plugin" property.
					Found: ${scriptModule}, which has keys ${Object.keys(scriptModule)}.
				`);
			}

			return {
				...script,
				module: scriptModule,
			};
		});
		this.recreateMarkupToHtml();

		// If possible, rerenders with the last rendering settings. The goal
		// of this is to reduce the number of IPC calls between the viewer and
		// React Native. We want the first render to be as fast as possible.
		if (this.lastRenderMarkup) {
			await this.rerender(this.lastRenderMarkup, this.lastSettings);
		}
	}

	public async rerender(markup: MarkupRecord, settings: RendererSettings) {
		this.lastSettings = settings;
		this.lastRenderMarkup = markup;

		const options: RenderOptions = {
			onResourceLoaded: settings.onResourceLoaded,
			highlightedKeywords: settings.highlightedKeywords,
			resources: settings.resources,
			codeTheme: settings.codeTheme,
			postMessageSyntax: 'window.joplinPostMessage_',
			enableLongPress: true,

			// Show an 'edit' popup over SVG images
			editPopupFiletypes: ['image/svg+xml'],
			createEditPopupSyntax: settings.createEditPopupSyntax,
			destroyEditPopupSyntax: settings.destroyEditPopupSyntax,
			itemIdToUrl: this.setupOptions.useTransferredFiles ? (id: string) => this.getResourcePathOverride(id) : undefined,

			settingValue: (pluginId: string, settingName: string) => {
				const settingKey = `${pluginId}.${settingName}`;

				if (!(settingKey in settings.pluginSettings)) {
					// This should make the setting available on future renders.
					settings.requestPluginSetting(pluginId, settingName);
					return undefined;
				}

				return settings.pluginSettings[settingKey];
			},
			whiteBackgroundNoteRendering: markup.language === MarkupLanguage.Html,
		};

		this.markupToHtml.clearCache(markup.language);

		const contentContainer = document.getElementById('joplin-container-content');

		let html = '';
		let pluginAssets: RenderResultPluginAsset[] = [];
		try {
			const result = await this.markupToHtml.render(
				markup.language,
				markup.markup,
				JSON.parse(settings.theme),
				options,
			);
			html = result.html;
			pluginAssets = result.pluginAssets;
		} catch (error) {
			if (!contentContainer) {
				alert(`Renderer error: ${error}`);
			} else {
				contentContainer.innerText = `
					Error: ${error}
					
					${error.stack ?? ''}
				`;
			}
			throw error;
		}

		contentContainer.innerHTML = html;

		// Adding plugin assets can be slow -- run it asynchronously.
		void (async () => {
			await addPluginAssets(pluginAssets, {
				inlineAssets: this.setupOptions.useTransferredFiles,
				readAssetBlob: settings.readAssetBlob,
			});

			// Some plugins require this event to be dispatched just after being added.
			document.dispatchEvent(new Event('joplin-noteDidUpdate'));
		})();

		this.afterRender(settings);
	}

	private afterRender(renderSettings: RendererSettings) {
		const readyStateCheckInterval = setInterval(() => {
			if (document.readyState === 'complete') {
				clearInterval(readyStateCheckInterval);
				if (this.setupOptions.settings.resourceDownloadMode === 'manual') {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					(window as any).webviewLib.setupResourceManualDownload();
				}

				const hash = renderSettings.noteHash;
				const initialScroll = renderSettings.initialScroll;

				// Don't scroll to a hash if we're given initial scroll (initial scroll
				// overrides scrolling to a hash).
				if ((initialScroll ?? null) !== null) {
					const scrollingElement = document.scrollingElement ?? document.documentElement;
					scrollingElement.scrollTop = initialScroll;
				} else if (hash) {
					// Gives it a bit of time before scrolling to the anchor
					// so that images are loaded.
					setTimeout(() => {
						const e = document.getElementById(hash);
						if (!e) {
							console.warn('Cannot find hash', hash);
							return;
						}
						e.scrollIntoView();
					}, 500);
				}
			}
		}, 10);
	}

	public clearCache(markupLanguage: MarkupLanguage) {
		this.markupToHtml.clearCache(markupLanguage);
	}

	private extraCssElements: Record<string, HTMLStyleElement> = {};
	public setExtraCss(key: string, css: string) {
		if (this.extraCssElements.hasOwnProperty(key)) {
			this.extraCssElements[key].remove();
		}

		const extraCssElement = document.createElement('style');
		extraCssElement.appendChild(document.createTextNode(css));
		document.head.appendChild(extraCssElement);

		this.extraCssElements[key] = extraCssElement;
	}
}
