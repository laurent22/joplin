const TurndownService = require('turndown')

class HtmlToMd {

	parse(html) {
		const turndownPluginGfm = require('turndown-plugin-gfm').gfm
		const turndown = new TurndownService()
		turndown.use(turndownPluginGfm)
		turndown.remove('script');
		let markdown = turndown.turndown(html)
		return markdown;
	}

}

module.exports = HtmlToMd;