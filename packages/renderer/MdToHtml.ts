import InMemoryCache from './InMemoryCache';
import noteStyle from './noteStyle';
import { fileExtension } from './pathUtils';
import setupLinkify from './MdToHtml/setupLinkify';
import validateLinks from './MdToHtml/validateLinks';
import { ItemIdToUrlHandler } from './utils';
import { RenderResult, RenderResultPluginAsset } from './MarkupToHtml';
import { Options as NoteStyleOptions } from './noteStyle';
import hljs from './highlight';

const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const MarkdownIt = require('markdown-it');
const md5 = require('md5');

export interface RenderOptions {
	contentMaxWidth?: number;
	bodyOnly?: boolean;
	splitted?: boolean;
	externalAssetsOnly?: boolean;
	postMessageSyntax?: string;
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
}

interface RendererRule {
	install(context: any, ruleOptions: any): any;
	assets?(theme: any): any;
	plugin?: any;
	assetPath?: string;
	assetPathIsAbsolute?: boolean;
}

interface RendererRules {
	[pluginName: string]: RendererRule;
}

interface RendererPlugin {
	module: any;
	options?: any;
}

interface RendererPlugins {
	[pluginName: string]: RendererPlugin;
}

// /!\/!\ Note: the order of rules is important!! /!\/!\
const rules: RendererRules = {
	fence: require('./MdToHtml/rules/fence').default,
	sanitize_html: require('./MdToHtml/rules/sanitize_html').default,
	image: require('./MdToHtml/rules/image').default,
	checkbox: require('./MdToHtml/rules/checkbox').default,
	katex: require('./MdToHtml/rules/katex').default,
	link_open: require('./MdToHtml/rules/link_open').default,
	link_close: require('./MdToHtml/rules/link_close').default,
	html_image: require('./MdToHtml/rules/html_image').default,
	highlight_keywords: require('./MdToHtml/rules/highlight_keywords').default,
	code_inline: require('./MdToHtml/rules/code_inline').default,
	fountain: require('./MdToHtml/rules/fountain').default,
	mermaid: require('./MdToHtml/rules/mermaid').default,
	source_map: require('./MdToHtml/rules/source_map').default,
};

const uslug = require('@joplin/fork-uslug');
const markdownItAnchor = require('markdown-it-anchor');

// The keys must match the corresponding entry in Setting.js
const plugins: RendererPlugins = {
	mark: { module: require('markdown-it-mark') },
	footnote: { module: require('markdown-it-footnote') },
	sub: { module: require('markdown-it-sub') },
	sup: { module: require('markdown-it-sup') },
	deflist: { module: require('markdown-it-deflist') },
	abbr: { module: require('markdown-it-abbr') },
	emoji: { module: require('markdown-it-emoji') },
	insert: { module: require('markdown-it-ins') },
	multitable: { module: require('markdown-it-multimd-table'), options: { multiline: true, rowspan: true, headerless: true } },
	toc: { module: require('markdown-it-toc-done-right'), options: { listType: 'ul', slugify: slugify } },
	expand_tabs: { module: require('markdown-it-expand-tabs'), options: { tabWidth: 4 } },
};
const defaultNoteStyle = require('./defaultNoteStyle');

function slugify(s: string): string {
	return uslug(s);
}

// Share across all instances of MdToHtml
const inMemoryCache = new InMemoryCache(20);

export interface ExtraRendererRule {
	id: string;
	module: any;
	assetPath: string;
}

export interface Options {
	resourceBaseUrl?: string;
	ResourceModel?: any;
	pluginOptions?: any;
	tempDir?: string;
	fsDriver?: any;
	extraRendererRules?: ExtraRendererRule[];
	customCss?: string;
}

interface PluginAsset {
	mime?: string;
	inline?: boolean;
	name?: string;
	text?: string;
}

// Types are a bit of a mess when it comes to plugin assets. Something
// called "pluginAsset" in this class might refer to sublty different
// types. The logic should be cleaned up before types are added.
interface PluginAssets {
	[pluginName: string]: PluginAsset[];
}

export interface Link {
	href: string;
	resource: any;
	resourceReady: boolean;
	resourceFullPath: string;
}

interface PluginContext {
	css: any;
	pluginAssets: any;
	cache: any;
	userData: any;
	currentLinks: Link[];
}

export interface RuleOptions {
	context: PluginContext;
	theme: any;
	postMessageSyntax: string;
	ResourceModel: any;
	resourceBaseUrl: string;
	resources: any; // resourceId: Resource

	// Used by checkboxes to specify how it should be rendered
	checkboxRenderingType?: number;
	checkboxDisabled?: boolean;

	// Used by the keyword highlighting plugin (mobile only)
	highlightedKeywords?: any[];

	// Use by resource-rendering logic to signify that it should be rendered
	// as a plain HTML string without any attached JavaScript. Used for example
	// when exporting to HTML.
	plainResourceRendering?: boolean;

	// Use in mobile app to enable long-pressing an image or a linkg
	// to display a context menu. Used in `image.ts` and `link_open.ts`
	enableLongPress?: boolean;

	// Use by `link_open` rule.
	// linkRenderingType = 1 is the regular rendering and clicking on it is handled via embedded JS (in onclick attribute)
	// linkRenderingType = 2 gives a plain link with no JS. Caller needs to handle clicking on the link.
	linkRenderingType?: number;

	// A list of MIME types for which an edit button appears on tap/hover.
	// Used by the image editor in the mobile app.
	editPopupFiletypes?: string[];

	// Shoould be the string representation a function that accepts two arguments:
	// the target element to have the popup shown for and the id of the resource to edit.
	createEditPopupSyntax?: string;
	destroyEditPopupSyntax?: string;

	audioPlayerEnabled: boolean;
	videoPlayerEnabled: boolean;
	pdfViewerEnabled: boolean;
	useCustomPdfViewer: boolean;
	noteId?: string;
	vendorDir?: string;
	itemIdToUrl?: ItemIdToUrlHandler;
}

export default class MdToHtml {

	private resourceBaseUrl_: string;
	private ResourceModel_: any;
	private contextCache_: any;
	private fsDriver_: any;

	private cachedOutputs_: any = {};
	private lastCodeHighlightCacheKey_: string = null;
	private cachedHighlightedCode_: any = {};

	// Markdown-It plugin options (not Joplin plugin options)
	private pluginOptions_: any = {};
	private extraRendererRules_: RendererRules = {};
	private allProcessedAssets_: any = {};
	private customCss_: string = '';

	public constructor(options: Options = null) {
		if (!options) options = {};

		// Must include last "/"
		this.resourceBaseUrl_ = 'resourceBaseUrl' in options ? options.resourceBaseUrl : null;

		this.ResourceModel_ = options.ResourceModel;
		this.pluginOptions_ = options.pluginOptions ? options.pluginOptions : {};
		this.contextCache_ = inMemoryCache;

		this.fsDriver_ = {
			writeFile: (/* path, content, encoding = 'base64'*/) => { throw new Error('writeFile not set'); },
			exists: (/* path*/) => { throw new Error('exists not set'); },
			cacheCssToFile: (/* cssStrings*/) => { throw new Error('cacheCssToFile not set'); },
		};

		if (options.fsDriver) {
			if (options.fsDriver.writeFile) this.fsDriver_.writeFile = options.fsDriver.writeFile;
			if (options.fsDriver.exists) this.fsDriver_.exists = options.fsDriver.exists;
			if (options.fsDriver.cacheCssToFile) this.fsDriver_.cacheCssToFile = options.fsDriver.cacheCssToFile;
		}

		if (options.extraRendererRules) {
			for (const rule of options.extraRendererRules) {
				this.loadExtraRendererRule(rule.id, rule.assetPath, rule.module);
			}
		}

		this.customCss_ = options.customCss || '';
	}

	private fsDriver() {
		return this.fsDriver_;
	}

	public static pluginNames() {
		const output = [];
		for (const n in rules) output.push(n);
		for (const n in plugins) output.push(n);
		return output;
	}

	private pluginOptions(name: string) {
		// Currently link_close is only used to append the media player to
		// the resource links so we use the mediaPlayers plugin options for
		// it.
		if (name === 'link_close') name = 'mediaPlayers';

		let o = this.pluginOptions_[name] ? this.pluginOptions_[name] : {};
		o = Object.assign({
			enabled: true,
		}, o);

		return o;
	}

	private pluginEnabled(name: string) {
		return this.pluginOptions(name).enabled;
	}

	// `module` is a file that has already been `required()`
	public loadExtraRendererRule(id: string, assetPath: string, module: any) {
		if (this.extraRendererRules_[id]) throw new Error(`A renderer rule with this ID has already been loaded: ${id}`);
		this.extraRendererRules_[id] = {
			...module,
			assetPath,
			assetPathIsAbsolute: true,
		};
	}

	private ruleByKey(key: string): RendererRule {
		if (rules[key]) return rules[key];
		if (this.extraRendererRules_[key]) return this.extraRendererRules_[key];
		if (key === 'highlight.js') return null;
		throw new Error(`No such rule: ${key}`);
	}

	private processPluginAssets(pluginAssets: PluginAssets): RenderResult {
		const files: RenderResultPluginAsset[] = [];
		const cssStrings = [];
		for (const pluginName in pluginAssets) {

			const rule = this.ruleByKey(pluginName);

			for (const asset of pluginAssets[pluginName]) {
				let mime = asset.mime;

				if (!mime && asset.inline) throw new Error('Mime type is required for inline assets');

				if (!mime) {
					const ext = fileExtension(asset.name).toLowerCase();
					// For now it's only useful to support CSS and JS because that's what needs to be added
					// by the caller with <script> or <style> tags. Everything, like fonts, etc. is loaded
					// via CSS or some other ways.
					mime = 'application/octet-stream';
					if (ext === 'css') mime = 'text/css';
					if (ext === 'js') mime = 'application/javascript';
				}

				if (asset.inline) {
					if (mime === 'text/css') {
						cssStrings.push(asset.text);
					} else {
						throw new Error(`Unsupported inline mime type: ${mime}`);
					}
				} else {
					// TODO: we should resolve the path using
					// resolveRelativePathWithinDir() for increased
					// security, but the shim is not accessible from the
					// renderer, and React Native doesn't have this
					// function, so for now use the provided path as-is.

					const name = `${pluginName}/${asset.name}`;
					const assetPath = rule?.assetPath ? `${rule.assetPath}/${asset.name}` : `pluginAssets/${name}`;

					files.push(Object.assign({}, asset, {
						name: name,
						path: assetPath,
						pathIsAbsolute: !!rule && !!rule.assetPathIsAbsolute,
						mime: mime,
					}));
				}
			}
		}

		return {
			html: '',
			pluginAssets: files,
			cssStrings: cssStrings,
		};
	}

	// This return all the assets for all the plugins. Since it is called
	// on each render, the result is cached.
	private allProcessedAssets(rules: RendererRules, theme: any, codeTheme: string) {
		const cacheKey: string = theme.cacheKey + codeTheme;

		if (this.allProcessedAssets_[cacheKey]) return this.allProcessedAssets_[cacheKey];

		const assets: any = {};
		for (const key in rules) {
			if (!this.pluginEnabled(key)) continue;
			const rule = rules[key];

			if (rule.assets) {
				assets[key] = rule.assets(theme);
			}
		}

		assets['highlight.js'] = [{ name: codeTheme }];

		const output = this.processPluginAssets(assets);

		this.allProcessedAssets_ = {
			[cacheKey]: output,
		};

		return output;
	}

	// This is similar to allProcessedAssets() but used only by the Rich Text editor
	public async allAssets(theme: any, noteStyleOptions: NoteStyleOptions = null) {
		const assets: any = {};
		for (const key in rules) {
			if (!this.pluginEnabled(key)) continue;
			const rule = rules[key];

			if (rule.assets) {
				assets[key] = rule.assets(theme);
			}
		}

		const processedAssets = this.processPluginAssets(assets);
		processedAssets.cssStrings.splice(0, 0, noteStyle(theme, noteStyleOptions).join('\n'));
		if (this.customCss_) processedAssets.cssStrings.push(this.customCss_);
		const output = await this.outputAssetsToExternalAssets_(processedAssets);
		return output.pluginAssets;
	}

	private async outputAssetsToExternalAssets_(output: any) {
		for (const cssString of output.cssStrings) {
			const filePath = await this.fsDriver().cacheCssToFile(cssString);
			output.pluginAssets.push(filePath);
		}
		delete output.cssStrings;
		return output;
	}

	// The string we are looking for is: <p></p>\n
	private removeMarkdownItWrappingParagraph_(html: string) {
		if (html.length < 8) return html;

		// If there are multiple <p> tags, we keep them because it's multiple lines
		// and removing the first and last tag will result in invalid HTML.
		if ((html.match(/<\/p>/g) || []).length > 1) return html;

		if (html.substr(0, 3) !== '<p>') return html;
		if (html.slice(-5) !== '</p>\n') return html;
		return html.substring(3, html.length - 5);
	}

	public clearCache() {
		this.cachedOutputs_ = {};
	}

	private removeLastNewLine(s: string): string {
		if (s[s.length - 1] === '\n') {
			return s.substr(0, s.length - 1);
		} else {
			return s;
		}
	}

	// Rendering large code blocks can freeze the app so we disable it in
	// certain cases:
	// https://github.com/laurent22/joplin/issues/5593#issuecomment-947374218
	private shouldSkipHighlighting(str: string, lang: string): boolean {
		if (lang && !hljs.getLanguage(lang)) lang = '';
		if (str.length >= 1000 && !lang) return true;
		if (str.length >= 512000 && lang) return true;
		return false;
	}

	// "theme" is the theme as returned by themeStyle()
	public async render(body: string, theme: any = null, options: RenderOptions = null): Promise<RenderResult> {

		options = {
			// In bodyOnly mode, the rendered Markdown is returned without the wrapper DIV
			bodyOnly: false,
			// In splitted mode, the CSS and HTML will be returned in separate properties.
			// In non-splitted mode, CSS and HTML will be merged in the same document.
			splitted: false,
			// When this is true, all assets such as CSS or JS are returned as external
			// files. Otherwise some of them might be in the cssStrings property.
			externalAssetsOnly: false,
			postMessageSyntax: 'postMessage',
			highlightedKeywords: [],
			codeTheme: 'atom-one-light.css',
			theme: Object.assign({}, defaultNoteStyle, theme),
			plugins: {},

			audioPlayerEnabled: this.pluginEnabled('audioPlayer'),
			videoPlayerEnabled: this.pluginEnabled('videoPlayer'),
			pdfViewerEnabled: this.pluginEnabled('pdfViewer'),

			contentMaxWidth: 0,
			...options,
		};

		// The "codeHighlightCacheKey" option indicates what set of cached object should be
		// associated with this particular Markdown body. It is only used to allow us to
		// clear the cache whenever switching to a different note.
		// If "codeHighlightCacheKey" is not specified, code highlighting won't be cached.
		if (options.codeHighlightCacheKey !== this.lastCodeHighlightCacheKey_ || !options.codeHighlightCacheKey) {
			this.cachedHighlightedCode_ = {};
			this.lastCodeHighlightCacheKey_ = options.codeHighlightCacheKey;
		}

		const cacheKey = md5(escape(body + this.customCss_ + JSON.stringify(options) + JSON.stringify(options.theme)));
		const cachedOutput = this.cachedOutputs_[cacheKey];
		if (cachedOutput) return cachedOutput;

		const ruleOptions = Object.assign({}, options, {
			resourceBaseUrl: this.resourceBaseUrl_,
			ResourceModel: this.ResourceModel_,
		});

		const context: PluginContext = {
			css: {},
			pluginAssets: {},
			cache: this.contextCache_,
			userData: {},
			currentLinks: [],
		};

		const markdownIt = new MarkdownIt({
			breaks: !this.pluginEnabled('softbreaks'),
			typographer: this.pluginEnabled('typographer'),
			linkify: this.pluginEnabled('linkify'),
			html: true,
			highlight: (str: string, lang: string) => {
				let outputCodeHtml = '';

				// The strings includes the last \n that is part of the fence,
				// so we remove it because we need the exact code in the source block
				const trimmedStr = this.removeLastNewLine(str);
				const sourceBlockHtml = `<pre class="joplin-source" data-joplin-language="${htmlentities(lang)}" data-joplin-source-open="\`\`\`${htmlentities(lang)}&#10;" data-joplin-source-close="&#10;\`\`\`">${markdownIt.utils.escapeHtml(trimmedStr)}</pre>`;

				if (this.shouldSkipHighlighting(trimmedStr, lang)) {
					outputCodeHtml = markdownIt.utils.escapeHtml(trimmedStr);
				} else {
					try {
						let hlCode = '';

						const cacheKey = md5(`${str}_${lang}`);

						if (options.codeHighlightCacheKey && this.cachedHighlightedCode_[cacheKey]) {
							hlCode = this.cachedHighlightedCode_[cacheKey];
						} else {
							if (lang && hljs.getLanguage(lang)) {
								hlCode = hljs.highlight(trimmedStr, { language: lang, ignoreIllegals: true }).value;
							} else {
								hlCode = hljs.highlightAuto(trimmedStr).value;
							}
							this.cachedHighlightedCode_[cacheKey] = hlCode;
						}

						outputCodeHtml = hlCode;
					} catch (error) {
						outputCodeHtml = markdownIt.utils.escapeHtml(trimmedStr);
					}
				}

				const html = `<div class="joplin-editable">${sourceBlockHtml}<pre class="hljs"><code>${outputCodeHtml}</code></pre></div>`;

				if (rules.fence) {
					return {
						wrapCode: false,
						html: html,
					};
				} else {
					return html;
				}
			},
		});

		// To add a plugin, there are three options:
		//
		// 1. If the plugin does not need any application specific data, use the standard way:
		//
		//    const someMarkdownPlugin = require('someMarkdownPlugin');
		//    markdownIt.use(someMarkdownPlugin);
		//
		// 2. If the plugin does not need any application specific data, and you want the user
		//    to be able to toggle the plugin:
		//
		//    Add the plugin to the plugins object
		//    const plugins = {
		//      plugin: require('someMarkdownPlugin'),
		//    }
		//
		//    And add a corresponding entry into Setting.js
		//    'markdown.plugin.mark': {value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => _('Enable ==mark== syntax')},
		//
		// 3. If the plugin needs application data (in ruleOptions) or needs to pass data (CSS, files to load, etc.) back
		//    to the application (using the context object), use the application-specific way:
		//
		//    const imagePlugin = require('./MdToHtml/rules/image');
		//    markdownIt.use(imagePlugin(context, ruleOptions));
		//
		// Using the `context` object, a plugin can define what additional assets they need (css, fonts, etc.) using context.pluginAssets.
		// The calling application will need to handle loading these assets.

		const allRules = Object.assign({}, rules, this.extraRendererRules_);

		for (const key in allRules) {
			if (!this.pluginEnabled(key)) continue;

			const rule = allRules[key];

			markdownIt.use(rule.plugin, {
				context: context,
				...ruleOptions,
				...(ruleOptions.plugins[key] ? ruleOptions.plugins[key] : {}),
			});
		}

		markdownIt.use(markdownItAnchor, { slugify: slugify });

		for (const key in plugins) {
			if (this.pluginEnabled(key)) {
				markdownIt.use(plugins[key].module, plugins[key].options);
			}
		}

		markdownIt.validateLink = validateLinks;

		if (this.pluginEnabled('linkify')) setupLinkify(markdownIt);

		const renderedBody = markdownIt.render(body, context);

		let cssStrings = noteStyle(options.theme, {
			contentMaxWidth: options.contentMaxWidth,
		});

		let output = { ...this.allProcessedAssets(allRules, options.theme, options.codeTheme) };
		cssStrings = cssStrings.concat(output.cssStrings);

		if (this.customCss_) cssStrings.push(this.customCss_);

		if (options.bodyOnly) {
			// Markdown-it wraps any content in <p></p> by default. There's a function to parse without
			// adding these tags (https://github.com/markdown-it/markdown-it/issues/540#issuecomment-471123983)
			// however when using it, it seems the loaded plugins are not used. In my tests, just changing
			// render() to renderInline() means the checkboxes would not longer be rendered. So instead
			// of using this function, we manually remove the <p></p> tags.
			output.html = this.removeMarkdownItWrappingParagraph_(renderedBody);
			output.cssStrings = cssStrings;
		} else {
			const styleHtml = `<style>${cssStrings.join('\n')}</style>`;
			output.html = `${styleHtml}<div id="rendered-md">${renderedBody}</div>`;

			if (options.splitted) {
				output.cssStrings = cssStrings;
				output.html = `<div id="rendered-md">${renderedBody}</div>`;
			}
		}

		if (options.externalAssetsOnly) output = await this.outputAssetsToExternalAssets_(output);

		// Fow now, we keep only the last entry in the cache
		this.cachedOutputs_ = {};
		this.cachedOutputs_[cacheKey] = output;

		return output;
	}

}
