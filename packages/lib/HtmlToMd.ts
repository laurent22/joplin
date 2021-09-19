const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm').gfm;
import markdownUtils from './markdownUtils';

export interface ParseOptions {
	anchorNames?: string[];
	preserveImageTagsWithSize?: boolean;
	baseUrl?: string;
	disableEscapeContent?: boolean;
}

export default class HtmlToMd {

	public parse(html: string, options: ParseOptions = {}) {
		const turndown = new TurndownService({
			headingStyle: 'atx',
			anchorNames: options.anchorNames ? options.anchorNames.map(n => n.trim().toLowerCase()) : [],
			codeBlockStyle: 'fenced',
			preserveImageTagsWithSize: !!options.preserveImageTagsWithSize,
			bulletListMarker: '-',
			emDelimiter: '*',
			strongDelimiter: '**',
			br: '',
			disableEscapeContent: 'disableEscapeContent' in options ? options.disableEscapeContent : false,
		});
		turndown.use(turndownPluginGfm);
		turndown.remove('script');
		turndown.remove('style');
		let md = turndown.turndown(html);
		if (options.baseUrl) md = markdownUtils.prependBaseUrl(md, options.baseUrl);
		return md;
	}

}
