const { enexXmlToMd } = require('lib/import-enex-md-gen.js');

class HtmlToMarkdownParser {

	async parse(html, options = {}) {
		if (!options.baseUrl) options.baseUrl = '';

		const markdown = await enexXmlToMd(html, [], options);
		return markdown;
	}

}

module.exports = HtmlToMarkdownParser;