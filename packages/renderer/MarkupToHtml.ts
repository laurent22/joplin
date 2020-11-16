import MdToHtml from './MdToHtml';
const HtmlToHtml = require('./HtmlToHtml');
const htmlUtils = require('./htmlUtils');
const MarkdownIt = require('markdown-it');

export enum MarkupLanguage {
	Markdown = 1,
	Html = 2,
}

export default class MarkupToHtml {

	static MARKUP_LANGUAGE_MARKDOWN: number = MarkupLanguage.Markdown;
	static MARKUP_LANGUAGE_HTML: number = MarkupLanguage.Html;

	private renderers_: any = {};
	private options_: any;
	private rawMarkdownIt_: any;

	constructor(options: any) {
		this.options_ = Object.assign({}, {
			ResourceModel: {
				isResourceUrl: () => false,
			},
		}, options);
	}

	renderer(markupLanguage: MarkupLanguage) {
		if (this.renderers_[markupLanguage]) return this.renderers_[markupLanguage];

		let RendererClass = null;

		if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
			RendererClass = MdToHtml;
		} else if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			RendererClass = HtmlToHtml;
		} else {
			throw new Error(`Invalid markup language: ${markupLanguage}`);
		}

		this.renderers_[markupLanguage] = new RendererClass(this.options_);
		return this.renderers_[markupLanguage];
	}

	stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: any = null) {
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

	clearCache(markupLanguage: MarkupLanguage) {
		const r = this.renderer(markupLanguage);
		if (r.clearCache) r.clearCache();
	}

	async render(markupLanguage: MarkupLanguage, markup: string, theme: any, options: any) {
		return this.renderer(markupLanguage).render(markup, theme, options);
	}

	async allAssets(markupLanguage: MarkupLanguage, theme: any) {
		return this.renderer(markupLanguage).allAssets(theme);
	}
}
