const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm').gfm;

// Avoid using @joplin/lib/HtmlToMd here. HtmlToMd may cause several megabytes
// of additional JavaScript and supporting data to be included.

const convertHtmlToMarkdown = (html: string|HTMLElement) => {
	const turndownOpts = {
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		preserveImageTagsWithSize: true,
		preserveNestedTables: true,
		preserveColorStyles: true,
		bulletListMarker: '-',
		emDelimiter: '*',
		strongDelimiter: '**',
		allowResourcePlaceholders: true,

		// If soft-breaks are enabled, lines need to end with two or more spaces for
		// trailing <br/>s to render. See
		// https://github.com/laurent22/joplin/issues/8430
		br: '  ',
	};
	const turndown = new TurndownService(turndownOpts);
	turndown.use(turndownPluginGfm);
	turndown.remove('script');
	turndown.remove('style');
	const md = turndown.turndown(html);
	return md;
};

export default convertHtmlToMarkdown;
