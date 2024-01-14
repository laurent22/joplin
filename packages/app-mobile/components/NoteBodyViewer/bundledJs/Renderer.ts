import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import type { MarkupToHtmlConverter, RenderResultPluginAsset, FsDriver as RendererFsDriver } from '@joplin/renderer/types';
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
	fsDriver: RendererFsDriver;
	pluginOptions: Record<string, any>;
}

export interface RendererSettings {
	theme: string;
	onResourceLoaded: ()=> void;
	highlightedKeywords: string[];
	resources: Record<string, any>;
	codeTheme: string;
	noteHash: string;
	initialScroll: number;

	createEditPopupSyntax: string;
	destroyEditPopupSyntax: string;
}

export interface MarkupRecord {
	language: MarkupLanguage;
	markup: string;
}

export default class Renderer {
	private markupToHtml: MarkupToHtmlConverter;
	private settings: RendererSettings|null = null;
	private extraContentScripts: ExtraContentScript[] = [];
	private lastRenderMarkup: MarkupRecord|null = null;

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

	public async setExtraContentScripts(
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

		if (this.lastRenderMarkup) {
			await this.rerender(this.lastRenderMarkup);
		}
	}

	public async configure(settings: RendererSettings) {
		this.settings = settings;
	}

	public async rerender(markup: MarkupRecord) {
		this.lastRenderMarkup = markup;
		if (!this.settings) {
			throw new Error('Renderer wrapper not yet initialized!');
		}

		const options = {
			onResourceLoaded: this.settings.onResourceLoaded,
			highlightedKeywords: this.settings.highlightedKeywords,
			resources: this.settings.resources,
			codeTheme: this.settings.codeTheme,
			postMessageSyntax: 'window.joplinPostMessage_',
			enableLongPress: true,

			// Show an 'edit' popup over SVG images
			editPopupFiletypes: ['image/svg+xml'],
			createEditPopupSyntax: this.settings.createEditPopupSyntax,
			destroyEditPopupSyntax: this.settings.destroyEditPopupSyntax,
		};

		this.markupToHtml.clearCache(markup.language);

		const contentContainer = document.getElementById('joplin-container-content');

		let html = '';
		let pluginAssets: RenderResultPluginAsset[] = [];
		try {
			const result = await this.markupToHtml.render(
				markup.language,
				markup.markup,
				JSON.parse(this.settings.theme),
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
		addPluginAssets(pluginAssets);

		this.afterRender();
	}

	private afterRender() {
		const readyStateCheckInterval = setInterval(() => {
			if (document.readyState === 'complete') {
				clearInterval(readyStateCheckInterval);
				if (this.setupOptions.settings.resourceDownloadMode === 'manual') {
					(window as any).webviewLib.setupResourceManualDownload();
				}

				const hash = this.settings.noteHash;
				const initialScroll = this.settings.initialScroll;

				// Don't scroll to a hash if we're given initial scroll (initial scroll
				// overrides scrolling to a hash).
				if ((initialScroll ?? null) !== null) {
					document.scrollingElement.scrollTop = initialScroll;
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

		// Used by some parts of the renderer (e.g. to rerender mermaid.js diagrams).
		document.dispatchEvent(new Event('joplin-noteDidUpdate'));
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
