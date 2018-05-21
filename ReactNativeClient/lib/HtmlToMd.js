const TurndownService = require('joplin-turndown')

class HtmlToMd {

	parse(html) {
		const turndownPluginGfm = require('joplin-turndown-plugin-gfm').gfm
		const turndown = new TurndownService({
			headingStyle: 'atx',
		})
		turndown.use(turndownPluginGfm)
		turndown.remove('script');
		let markdown = turndown.turndown(html)
		return markdown;
	}

}

module.exports = HtmlToMd;