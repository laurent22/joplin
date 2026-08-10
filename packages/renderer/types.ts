import { Options as NoteStyleOptions } from './noteStyle';

export enum MarkupLanguage {
	Markdown = 1,
	Html = 2,
	Any = 3,
}

export type ItemIdToUrlHandler = (resourceId: string, urlParameters?: string)=> string;

// Subset of the application theme object accessed by the renderer. Fields are
// marked optional because the renderer is called from many entry points (lib,
// server, app-mobile, app-desktop, tests) with theme objects of varying
// shapes — including bare {} in tests, ThemeStyle from @joplin/lib, and
// merges with `defaultNoteStyle` done inside MdToHtml. Treat this as a loose
// structural description rather than a strict contract.
export interface RendererTheme {
	cacheKey?: number;
	appearance?: string;

	color?: string;
	backgroundColor?: string;
	backgroundColorHover3?: string;
	codeBackgroundColor?: string;
	codeBorderColor?: string;
	codeColor?: string;
	codeFontSize?: string | number;
	dividerColor?: string;
	raisedBackgroundColor?: string;
	tableBackgroundColor?: string;
	urlColor?: string;
	markHighlightBackgroundColor?: string;
	searchMarkerColor?: string;

	scrollbarThumbColor?: string;
	scrollbarThumbColorHover?: string;

	fontSize?: number;
	noteViewerFontSize?: string | number;
	lineHeight?: string;
	listTabSize?: string;
	bodyPaddingTop?: string | number;
	bodyPaddingBottom?: string | number;
	blockQuoteOpacity?: number;

	buttonStyle?: {
		backgroundColor: string;
		border: string;
		borderRadius: number;
	};
}

export interface ResourceEntity {
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Return is used loosely as a RenderResultPluginAsset; tightening it would force logic changes
	cacheCssToFile: (cssStrings: string[])=> Promise<any>;
}

export interface RenderOptionsGlobalSettings {
	'markdown.plugin.abc.options': string;
}

interface SettingModel {
	value: <T>(key: string)=> T;
}

export const getGlobalSettings = (settingModel?: SettingModel): RenderOptionsGlobalSettings => {
	return {
		'markdown.plugin.abc.options': settingModel ? settingModel.value<string>('markdown.plugin.abc.options') : '',
	};
};

export interface RenderOptions {
	contentMaxWidth?: number;
	scrollbarSize?: number;
	baseFontFamily?: string;
	bodyOnly?: boolean;
	splitted?: boolean;
	enableLongPress?: boolean;
	postMessageSyntax?: string;

	externalAssetsOnly?: boolean;
	highlightedKeywords?: string[];
	codeTheme?: string;
	theme?: RendererTheme;

	plugins?: Record<string, Record<string, unknown>>;
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
	settingValue?: (pluginId: string, key: string)=> unknown;

	resources?: ResourceInfos;

	editPopupFiletypes?: string[];
	createEditPopupSyntax?: string;
	destroyEditPopupSyntax?: string;

	platformName?: string;

	showNoteLinkIcon?: boolean;

	// HtmlToHtml only
	whiteBackgroundNoteRendering?: boolean;

	// This can be used to give access to global settings to Markdown renderer plugins
	globalSettings?: RenderOptionsGlobalSettings;
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
	render(markup: string, theme: RendererTheme, options: RenderOptions): Promise<RenderResult>;
	clearCache(): void;
	allAssets(theme: RendererTheme, noteStyleOptions: NoteStyleOptions|null): Promise<RenderResultPluginAsset[]>;
}

interface StripMarkupOptions {
	collapseWhiteSpaces: boolean;
}

export interface MarkupToHtmlConverter {
	render(markupLanguage: MarkupLanguage, markup: string, theme: RendererTheme, options: RenderOptions): Promise<RenderResult>;
	clearCache(markupLanguage: MarkupLanguage): void;
	stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: StripMarkupOptions): string;
	allAssets(markupLanguage: MarkupLanguage, theme: RendererTheme, noteStyleOptions: NoteStyleOptions|null): Promise<RenderResultPluginAsset[]>;
}

export interface OptionsResourceModel {
	isResourceUrl: (url: string)=> boolean;
	urlToId: (url: string)=> string;
	filename: (resource: ResourceEntity, encryptedBlob?: boolean)=> string;
	isSupportedImageMimeType: (type: string)=> boolean;
	fullPath?: (resource: ResourceEntity, encryptedBlob?: boolean)=> string;
}
