const TurndownService = require('turndown')

class HtmlToMd {

	parse(html) {
		const turndownService = new TurndownService()
		let markdown = turndownService.turndown(html)
		return markdown;
	}

}

module.exports = HtmlToMd;