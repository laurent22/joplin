const markdownUtils = require('lib/markdownUtils');
const htmlUtils = require('lib/htmlUtils');
const Note = require('lib/models/Note');

class MarkupLanguageUtils {
	lib_(language) {
		if (language === Note.MARKUP_LANGUAGE_HTML) return htmlUtils;
		if (language === Note.MARKUP_LANGUAGE_MARKDOWN) return markdownUtils;
		throw new Error('Unsupported markup language: ' + language);
	}

	extractImageUrls(language, text) {
		return this.lib_(language).extractImageUrls(text);
	}
}

const markupLanguageUtils = new MarkupLanguageUtils();

module.exports = markupLanguageUtils;
