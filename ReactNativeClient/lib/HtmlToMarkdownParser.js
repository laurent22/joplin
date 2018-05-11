const { enexXmlToMd } = require('lib/import-enex-md-gen.js');
const stringToStream = require('string-to-stream')

class HtmlToMarkdownParser {

	async parse(html, options = {}) {
		if (!options.baseUrl) options.baseUrl = '';

		const contentStream = stringToStream(html);
		const markdown = await enexXmlToMd(contentStream, [], options);
		return markdown;
	}

}

module.exports = HtmlToMarkdownParser;