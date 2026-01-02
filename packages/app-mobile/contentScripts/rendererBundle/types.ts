import type { MarkupLanguage, FsDriver as RendererFsDriver, RenderResult, ResourceInfos } from '@joplin/renderer/types';
import type Renderer from './contentScript/Renderer';
import { PluginOptions } from '@joplin/renderer/MarkupToHtml';

// Joplin settings (as from Setting.value(...)) that should
// remain constant during editing.
export interface ForwardedJoplinSettings {
	safeMode: boolean;
	tempDir: string;
	resourceDir: string;
	resourceDownloadMode: string;
}

export interface RendererWebViewOptions {
	settings: ForwardedJoplinSettings;

	// True if asset and resource files should be transferred to the WebView before rendering.
	// This must be true on web, where asset and resource files are virtual and can't be accessed
	// without transferring.
	useTransferredFiles: boolean;

	// Enabled/disabled Markdown plugins
	pluginOptions: PluginOptions;
}

export interface ExtraContentScriptSource {
	id: string;
	js: string;
	assetPath: string;
	pluginId: string;
}

export interface ScrollEvent {
	fraction: number; // e.g. 0.5 when scrolled 50% of the way through the document
}

export type OnScrollCallback = (scrollTop: ScrollEvent)=> void;

export interface RendererProcessApi {
	renderer: Renderer;
	jumpToHash: (hash: string)=> void;
}

export interface MainProcessApi {
	onScroll: OnScrollCallback;
	onPostMessage(message: string): void;
	onPostPluginMessage(contentScriptId: string, message: unknown): Promise<unknown>;
	fsDriver: RendererFsDriver;
}

export interface MarkupRecord {
	language: MarkupLanguage;
	markup: string;
}

export interface RenderOptions {
	themeId: number;
	highlightedKeywords: string[];
	resources: ResourceInfos;
	themeOverrides: Record<string, string|number>;

	// If null, plugin assets will not be added to the document.
	pluginAssetContainerSelector: string|null;
	// When true, plugin assets are removed from the container when not used by the render result.
	// This should be true for full-page renders.
	removeUnusedPluginAssets: boolean;

	noteHash: string;
	initialScrollPercent: number;

	// Forwarded renderer settings
	splitted?: boolean;
	mapsToLine?: boolean;
}

type CancelEvent = { cancelled: boolean };

export interface RendererControl {
	rerenderToBody(markup: MarkupRecord, options: RenderOptions, cancelEvent?: CancelEvent): Promise<string|void>;
	render(markup: MarkupRecord, options: RenderOptions): Promise<RenderResult>;
	clearCache(markupLanguage: MarkupLanguage): void;
}
