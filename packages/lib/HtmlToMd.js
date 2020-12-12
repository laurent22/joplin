const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm').gfm;
const markdownUtils = require('./markdownUtils').default;

class HtmlToMd {
	parse(html, options = {}) {
		const turndown = new TurndownService({
			headingStyle: 'atx',
			anchorNames: options.anchorNames ? options.anchorNames.map(n => n.trim().toLowerCase()) : [],
			codeBlockStyle: 'fenced',
			preserveImageTagsWithSize: !!options.preserveImageTagsWithSize,
			bulletListMarker: '-',
			emDelimiter: '*',
			strongDelimiter: '**',
			br: '',
		});
		turndown.use(turndownPluginGfm);
		turndown.remove('script');
		turndown.remove('style');
		let md = turndown.turndown(html);
		if (options.baseUrl) md = markdownUtils.prependBaseUrl(md, options.baseUrl);
		return md;
	}
}

module.exports = HtmlToMd;
