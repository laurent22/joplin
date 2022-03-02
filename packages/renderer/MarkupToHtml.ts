import MdToHtml from './MdToHtml';
import HtmlToHtml from './HtmlToHtml';
import htmlUtils from './htmlUtils';
import { Options as NoteStyleOptions } from './noteStyle';
const MarkdownIt = require('markdown-it');

export enum MarkupLanguage {
	Markdown = 1,
	Html = 2,
	Any = 3,
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

export interface OptionsResourceModel {
	isResourceUrl: (url: string)=> boolean;
}

export interface Options {
	isSafeMode?: boolean;
	ResourceModel?: OptionsResourceModel;
	customCss?: string;
	extraRendererRules?: any[];
	resourceBaseUrl?: string;
}

export default class MarkupToHtml {

	static MARKUP_LANGUAGE_MARKDOWN: number = MarkupLanguage.Markdown;
	static MARKUP_LANGUAGE_HTML: number = MarkupLanguage.Html;

	private renderers_: any = {};
	private options_: Options;
	private rawMarkdownIt_: any;

	public constructor(options: Options = null) {
		this.options_ = {
			ResourceModel: {
				isResourceUrl: () => false,
			},
			isSafeMode: false,
			...options,
		};
	}

	private renderer(markupLanguage: MarkupLanguage) {
		if (this.renderers_[markupLanguage]) return this.renderers_[markupLanguage];

		let RendererClass = null;

		if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
			RendererClass = MdToHtml;
		} else if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			RendererClass = HtmlToHtml;
		} else {
			throw new Error(`Invalid markup language: ${markupLanguage}`);
		}

		this.renderers_[markupLanguage] = new RendererClass(this.options_ as any);
		return this.renderers_[markupLanguage];
	}

	public stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: any = null) {
		if (!markup) return '';

		options = Object.assign({}, {
			collapseWhiteSpaces: false,
		}, options);

		let output = markup;

		if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
			if (!this.rawMarkdownIt_) {
				// We enable HTML because we don't want it to be escaped, so
				// that it can be stripped off in the stripHtml call below.
				this.rawMarkdownIt_ = new MarkdownIt({ html: true });
			}
			output = this.rawMarkdownIt_.render(output);
		}

		output = htmlUtils.stripHtml(output).trim();

		if (options.collapseWhiteSpaces) {
			output = output.replace(/\n+/g, ' ');
			output = output.replace(/\s+/g, ' ');
		}

		return output;
	}

	public clearCache(markupLanguage: MarkupLanguage) {
		const r = this.renderer(markupLanguage);
		if (r.clearCache) r.clearCache();
	}

	public async render(markupLanguage: MarkupLanguage, markup: string, theme: any, options: any): Promise<RenderResult> {
		if (this.options_.isSafeMode) {
			return {
				html: `<pre>${markup}</pre>`,
				cssStrings: [],
				pluginAssets: [],
			};
		}
		return this.renderer(markupLanguage).render(markup, theme, options);
	}

	public async allAssets(markupLanguage: MarkupLanguage, theme: any, noteStyleOptions: NoteStyleOptions = null) {
		return this.renderer(markupLanguage).allAssets(theme, noteStyleOptions);
	}
}
