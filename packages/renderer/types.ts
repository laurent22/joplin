import { MarkupLanguage } from './MarkupToHtml';
import { Options as NoteStyleOptions } from './noteStyle';

export type ItemIdToUrlHandler = (resource: any)=> string;

interface ResourceEntity {
	id: string;
	title?: string;
	mime?: string;
	file_extension?: string;
}

export interface RenderOptions {
	contentMaxWidth?: number;
	bodyOnly?: boolean;
	splitted?: boolean;
	enableLongPress?: boolean;
	postMessageSyntax?: string;

	externalAssetsOnly?: boolean;
	highlightedKeywords?: string[];
	codeTheme?: string;
	theme?: any;

	plugins?: Record<string, any>;
	audioPlayerEnabled?: boolean;
	videoPlayerEnabled?: boolean;
	pdfViewerEnabled?: boolean;

	codeHighlightCacheKey?: string;
	plainResourceRendering?: boolean;

	mapsToLine?: boolean;
	useCustomPdfViewer?: boolean;
	noteId?: string;
	vendorDir?: string;
	itemIdToUrl?: ItemIdToUrlHandler;
	allowedFilePrefixes?: string[];
	settingValue?: (pluginId: string, key: string)=> any;

	resources?: Record<string, ResourceEntity>;

	// HtmlToHtml only
	whiteBackgroundNoteRendering?: boolean;
}

export interface RenderResultPluginAsset {
	name: string;
	mime: string;
	path: string;

	// For built-in Mardown-it plugins, the asset path is relative (and can be
	// found inside the @joplin/renderer package), while for external plugins
	// (content scripts), the path is absolute. We use this property to tell if
	// it's relative or absolute, as that will inform how it's loaded in various
	// places.
	pathIsAbsolute: boolean;
}

export interface RenderResult {
	html: string;
	pluginAssets: RenderResultPluginAsset[];
	cssStrings: string[];
}

export interface MarkupRenderer {
	render(markup: string, theme: any, options: RenderOptions): Promise<RenderResult>;
	clearCache(): void;
	allAssets(theme: any, noteStyleOptions: NoteStyleOptions|null): Promise<RenderResultPluginAsset[]>;
}

interface StripMarkupOptions {
	collapseWhiteSpaces: boolean;
}

export interface MarkupToHtmlConverter {
	render(markupLanguage: MarkupLanguage, markup: string, theme: any, options: any): Promise<RenderResult>;
	clearCache(markupLanguage: MarkupLanguage): void;
	stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: StripMarkupOptions): string;
	allAssets(markupLanguage: MarkupLanguage, theme: any, noteStyleOptions: NoteStyleOptions|null): Promise<RenderResultPluginAsset[]>;
}

export interface OptionsResourceModel {
	readonly isResourceUrl: (url: string)=> boolean;
	readonly urlToId: (url: string)=> string;
	readonly filename: (resource: ResourceEntity, encryptedBlob?: boolean)=> string;
	readonly isSupportedImageMimeType: (type: string)=> boolean;
	readonly fullPath?: (resource: ResourceEntity, encryptedBlob?: boolean)=> string;
}
