import { MarkupLanguage } from './MarkupToHtml';
import { Options as NoteStyleOptions } from './noteStyle';

export type ItemIdToUrlHandler = (resourceId: string, urlParameters?: string)=> string;

interface ResourceEntity {
	id?: string;
	title?: string;
	mime?: string;
	file_extension?: string;
	updated_time?: number;

	encryption_applied?: number;
	encryption_blob_encrypted?: number;
}

interface ResourceLocalState {
	fetch_status?: number;
}

export interface ResourceInfo {
	localState: ResourceLocalState;
	item: ResourceEntity;
}

export type ResourceInfos = Record<string, ResourceInfo>;

export interface FsDriver {
	writeFile: (path: string, content: string, encoding: string)=> Promise<void>;
	exists: (path: string)=> Promise<boolean>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	cacheCssToFile: (cssStrings: string[])=> Promise<any>;
}

export interface RenderOptions {
	contentMaxWidth?: number;
	scrollbarSize?: number;
	bodyOnly?: boolean;
	splitted?: boolean;
	enableLongPress?: boolean;
	postMessageSyntax?: string;

	externalAssetsOnly?: boolean;
	highlightedKeywords?: string[];
	codeTheme?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	theme?: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settingValue?: (pluginId: string, key: string)=> any;

	resources?: ResourceInfos;

	onResourceLoaded?: ()=> void;
	editPopupFiletypes?: string[];
	createEditPopupSyntax?: string;
	destroyEditPopupSyntax?: string;

	platformName?: string;

	// HtmlToHtml only
	whiteBackgroundNoteRendering?: boolean;
}

export interface RenderResultPluginAsset {
	source: string;
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	render(markup: string, theme: any, options: RenderOptions): Promise<RenderResult>;
	clearCache(): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	allAssets(theme: any, noteStyleOptions: NoteStyleOptions|null): Promise<RenderResultPluginAsset[]>;
}

interface StripMarkupOptions {
	collapseWhiteSpaces: boolean;
}

export interface MarkupToHtmlConverter {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	render(markupLanguage: MarkupLanguage, markup: string, theme: any, options: any): Promise<RenderResult>;
	clearCache(markupLanguage: MarkupLanguage): void;
	stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: StripMarkupOptions): string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	allAssets(markupLanguage: MarkupLanguage, theme: any, noteStyleOptions: NoteStyleOptions|null): Promise<RenderResultPluginAsset[]>;
}

export interface OptionsResourceModel {
	isResourceUrl: (url: string)=> boolean;
	urlToId: (url: string)=> string;
	filename: (resource: ResourceEntity, encryptedBlob?: boolean)=> string;
	isSupportedImageMimeType: (type: string)=> boolean;
	fullPath?: (resource: ResourceEntity, encryptedBlob?: boolean)=> string;
}
