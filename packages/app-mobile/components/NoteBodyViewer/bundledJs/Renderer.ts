import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import type { MarkupToHtmlConverter, FsDriver as RendererFsDriver } from '@joplin/renderer/types';
import makeResourceModel from './utils/makeResourceModel';
import addPluginAssets from './utils/addPluginAssets';

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

	public constructor(private setupOptions: RendererSetupOptions) {
		this.markupToHtml = new MarkupToHtml({
			fsDriver: setupOptions.fsDriver,
			isSafeMode: setupOptions.settings.safeMode,
			tempDir: setupOptions.settings.tempDir,
			ResourceModel: makeResourceModel(setupOptions.settings.resourceDir),
			pluginOptions: setupOptions.pluginOptions,
		});
	}

	public async configure(settings: RendererSettings) {
		this.settings = settings;
	}

	public async rerender(markup: MarkupRecord) {
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

		const { html, pluginAssets } = await this.markupToHtml.render(
			markup.language,
			markup.markup,
			JSON.parse(this.settings.theme),
			options,
		);

		const contentContainer = document.getElementById('joplin-container-content');
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
