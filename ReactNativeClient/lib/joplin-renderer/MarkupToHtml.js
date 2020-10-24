const MdToHtml = require('./MdToHtml');
const HtmlToHtml = require('./HtmlToHtml');
const htmlUtils = require('lib/htmlUtils');
const MarkdownIt = require('markdown-it');

class MarkupToHtml {
	constructor(options) {
		this.options_ = Object.assign({}, {
			ResourceModel: {
				isResourceUrl: () => false,
			},
		}, options);

		this.renderers_ = {};
	}

	renderer(markupLanguage) {
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

	injectedJavaScript() {
		return '';
	}

	stripMarkup(markupLanguage, markup, options = null) {
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

	async render(markupLanguage, markup, theme, options) {
		return this.renderer(markupLanguage).render(markup, theme, options);
	}

	async allAssets(markupLanguage, theme) {
		return this.renderer(markupLanguage).allAssets(theme);
	}
}

MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN = 1;
MarkupToHtml.MARKUP_LANGUAGE_HTML = 2;

module.exports = MarkupToHtml;
