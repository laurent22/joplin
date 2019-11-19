// testing ReactNativeClient/lib/markupLanguageUtils.js
require('app-module-path').addPath(__dirname);

const markupLanguageUtils = require('lib/markupLanguageUtils.js');
const Note = require('lib/models/Note');
const markdownUtils = require('lib/markdownUtils');
const htmlUtils = require('lib/htmlUtils');

describe('markupLanguageUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should recognise supported markup languages', function() {
		expect(markupLanguageUtils.lib_(Note.MARKUP_LANGUAGE_MARKDOWN)).toBe(markdownUtils);
		expect(markupLanguageUtils.lib_(Note.MARKUP_LANGUAGE_HTML)).toBe(htmlUtils);
	});

	it('should call correct handler for markup language', function() {
		const imageMd = '![something](http://test.com/img.png)';
		// eslint-disable-next-line no-undef
		spyOn(markdownUtils, 'extractImageUrls');
		markupLanguageUtils.extractImageUrls(Note.MARKUP_LANGUAGE_MARKDOWN, imageMd);
		expect(markdownUtils.extractImageUrls).toHaveBeenCalled();

		const imageHtml = '<img src="http://test.com/img.png"/>';
		// eslint-disable-next-line no-undef
		spyOn(htmlUtils, 'extractImageUrls');
		markupLanguageUtils.extractImageUrls(Note.MARKUP_LANGUAGE_HTML, imageHtml);
		expect(markdownUtils.extractImageUrls).toHaveBeenCalled();
	});
});
