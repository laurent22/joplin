const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm').gfm;
import markdownUtils from './markdownUtils';

export interface ParseOptions {
	anchorNames?: string[];
	preserveImageTagsWithSize?: boolean;
	baseUrl?: string;
	disableEscapeContent?: boolean;
	loadPdfs?: boolean;
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
		const pdfRule = {
			filter: ['embed', 'object'],
			replacement: function(_content: string, node: any, _options: any) {
				if (node.getAttribute('type') === 'application/pdf' && node.getAttribute('src')) {
					// We are adding _pdf: prefix so that we can later distingish them from normal links and create resources for them.
					return `[${node.getAttribute('src')}](_pdf:${node.getAttribute('src')})`;
				}
				return '';
			},
		};
		if (options.loadPdfs) {
			turndown.addRule('pdf', pdfRule);
		}
		let md = turndown.turndown(html);
		if (options.baseUrl) md = markdownUtils.prependBaseUrl(md, options.baseUrl, (url: string) => options.loadPdfs ? !url.startsWith('_pdf:') : true);
		return md;
	}

}
