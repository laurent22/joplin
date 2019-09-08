const MdToHtml = require('./MdToHtml');
const HtmlToHtml = require('./HtmlToHtml');
const Note = require('lib/models/Note');

class MarkupToHtml {
	constructor(options) {
		this.options_ = options;
		this.renderers_ = {};
	}

	renderer(markupLanguage) {
		if (this.renderers_[markupLanguage]) return this.renderers_[markupLanguage];

		let RendererClass = null;

		if (markupLanguage === Note.MARKUP_LANGUAGE_MARKDOWN) {
			RendererClass = MdToHtml;
		} else if (markupLanguage === Note.MARKUP_LANGUAGE_HTML) {
			RendererClass = HtmlToHtml;
		} else {
			throw new Error('Invalid markup language: ' + markupLanguage);
		}

		this.renderers_[markupLanguage] = new RendererClass(this.options_);
		return this.renderers_[markupLanguage];
	}

	injectedJavaScript() {
		return '';
	}

	render(markupLanguage, markup, theme, options) {
		return this.renderer(markupLanguage).render(markup, theme, options);
	}
}

module.exports = MarkupToHtml;
