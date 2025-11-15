import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import type { MarkupToHtmlConverter, RenderOptions, RenderOptionsGlobalSettings, FsDriver as RendererFsDriver, ResourceInfos } from '@joplin/renderer/types';
import makeResourceModel from './utils/makeResourceModel';
import addPluginAssets from './utils/addPluginAssets';
import { ExtraContentScriptSource, ForwardedJoplinSettings, MarkupRecord } from '../types';
import { ExtraContentScript } from '@joplin/lib/services/plugins/utils/loadContentScripts';
import { PluginOptions } from '@joplin/renderer/MarkupToHtml';
import afterFullPageRender from './utils/afterFullPageRender';

export interface RendererSetupOptions {
	settings: ForwardedJoplinSettings;
	useTransferredFiles: boolean;
	pluginOptions: PluginOptions;
	fsDriver: RendererFsDriver;
}

export interface RenderSettings {
	theme: string;
	highlightedKeywords: string[];
	resources: ResourceInfos;
	codeTheme: string;
	noteHash: string;
	initialScroll: number;
	// If [null], plugin assets are not added to the document
	pluginAssetContainerSelector: string|null;
	removeUnusedPluginAssets: boolean;

	splitted?: boolean; // Move CSS into a separate output
	mapsToLine?: boolean; // Sourcemaps

	createEditPopupSyntax: string;
	destroyEditPopupSyntax: string;

	pluginSettings: Record<string, unknown>;
	globalSettings?: RenderOptionsGlobalSettings;
	requestPluginSetting: (pluginId: string, settingKey: string)=> void;
	readAssetBlob: (assetPath: string)=> Promise<Blob>;
}

export interface RendererOutput {
	getOutputElement: ()=> HTMLElement;
	afterRender: (setupOptions: RendererSetupOptions, renderSettings: RenderSettings)=> void;
}

export default class Renderer {
	private markupToHtml_: MarkupToHtmlConverter;
	private lastBodyRenderSettings_: RenderSettings|null = null;
	private extraContentScripts_: ExtraContentScript[] = [];
	private lastBodyMarkup_: MarkupRecord|null = null;
	private lastPluginSettingsCacheKey_: string|null = null;
	private resourcePathOverrides_: Record<string, string> = Object.create(null);

	public constructor(private setupOptions_: RendererSetupOptions) {
		this.recreateMarkupToHtml_();
	}

	private recreateMarkupToHtml_() {
		this.markupToHtml_ = new MarkupToHtml({
			extraRendererRules: this.extraContentScripts_,
			fsDriver: this.setupOptions_.fsDriver,
			isSafeMode: this.setupOptions_.settings.safeMode,
			tempDir: this.setupOptions_.settings.tempDir,
			ResourceModel: makeResourceModel(this.setupOptions_.settings.resourceDir),
			pluginOptions: this.setupOptions_.pluginOptions,
		});
	}

	// Intended for web, where resources can't be linked to normally.
	public async setResourceFile(id: string, file: Blob) {
		this.resourcePathOverrides_[id] = URL.createObjectURL(file);
	}

	public getResourcePathOverride(resourceId: string) {
		if (Object.prototype.hasOwnProperty.call(this.resourcePathOverrides_, resourceId)) {
			return this.resourcePathOverrides_[resourceId];
		}
		return null;
	}

	public async setExtraContentScriptsAndRerender(
		extraContentScripts: ExtraContentScriptSource[],
	) {
		this.extraContentScripts_ = extraContentScripts.map(script => {
			const scriptModule = ((0, eval)(script.js))({
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
		this.recreateMarkupToHtml_();

		// If possible, rerenders with the last rendering settings. The goal
		// of this is to reduce the number of IPC calls between the viewer and
		// React Native. We want the first render to be as fast as possible.
		if (this.lastBodyMarkup_) {
			await this.rerenderToBody(this.lastBodyMarkup_, this.lastBodyRenderSettings_);
		}
	}

	public async render(markup: MarkupRecord, settings: RenderSettings) {
		const options: RenderOptions = {
			highlightedKeywords: settings.highlightedKeywords,
			resources: settings.resources,
			codeTheme: settings.codeTheme,
			postMessageSyntax: 'window.joplinPostMessage_',
			enableLongPress: true,

			// Show an 'edit' popup over SVG images
			editPopupFiletypes: ['image/svg+xml'],
			createEditPopupSyntax: settings.createEditPopupSyntax,
			destroyEditPopupSyntax: settings.destroyEditPopupSyntax,
			itemIdToUrl: this.setupOptions_.useTransferredFiles ? (id: string) => this.getResourcePathOverride(id) : undefined,

			settingValue: (pluginId: string, settingName: string) => {
				const settingKey = `${pluginId}.${settingName}`;

				if (!(settingKey in settings.pluginSettings)) {
					// This should make the setting available on future renders.
					settings.requestPluginSetting(pluginId, settingName);
					return undefined;
				}

				return settings.pluginSettings[settingKey];
			},
			splitted: settings.splitted,
			mapsToLine: settings.mapsToLine,
			whiteBackgroundNoteRendering: markup.language === MarkupLanguage.Html,
			globalSettings: settings.globalSettings,
		};

		const pluginSettingsCacheKey = JSON.stringify(settings.pluginSettings);
		if (pluginSettingsCacheKey !== this.lastPluginSettingsCacheKey_) {
			this.lastPluginSettingsCacheKey_ = pluginSettingsCacheKey;
			this.markupToHtml_.clearCache(markup.language);
		}

		const result = await this.markupToHtml_.render(
			markup.language,
			markup.markup,
			JSON.parse(settings.theme),
			options,
		);

		// Adding plugin assets can be slow -- run it asynchronously.
		if (settings.pluginAssetContainerSelector) {
			void (async () => {
				await addPluginAssets(result.pluginAssets, {
					inlineAssets: this.setupOptions_.useTransferredFiles,
					readAssetBlob: settings.readAssetBlob,
					container: document.querySelector(settings.pluginAssetContainerSelector),
					removeUnusedPluginAssets: settings.removeUnusedPluginAssets,
				});

				// Some plugins require this event to be dispatched just after being added.
				document.dispatchEvent(new Event('joplin-noteDidUpdate'));
			})();
		}

		return result;
	}

	public async rerenderToBody(markup: MarkupRecord, settings: RenderSettings) {
		this.lastBodyMarkup_ = markup;
		this.lastBodyRenderSettings_ = settings;

		const contentContainer = document.getElementById('joplin-container-content') ?? document.body;

		let html = '';
		try {
			const result = await this.render(markup, settings);
			html = result.html;
		} catch (error) {
			if (!contentContainer) {
				alert(`Renderer error: ${error}`);
			} else {
				contentContainer.textContent = `
					Error: ${error}
					
					${error.stack ?? ''}
				`;
			}
			throw error;
		}

		if (contentContainer) {
			contentContainer.innerHTML = html;
		}

		afterFullPageRender(this.setupOptions_, settings);
	}

	public clearCache(markupLanguage: MarkupLanguage) {
		this.markupToHtml_.clearCache(markupLanguage);
	}
}
