const TurndownService = require('joplin-turndown')
const markdownUtils = require('lib/markdownUtils');

class HtmlToMd {

	parse(html, options = {}) {
		const turndownPluginGfm = require('joplin-turndown-plugin-gfm').gfm
		const turndown = new TurndownService({
			headingStyle: 'atx',
		})
		turndown.use(turndownPluginGfm)
		turndown.remove('script');
		let md = turndown.turndown(html)
		if (options.baseUrl) md = markdownUtils.prependBaseUrl(md, options.baseUrl);
		return md;
	}

}

module.exports = HtmlToMd;